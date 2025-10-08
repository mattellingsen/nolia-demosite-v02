import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { prisma } from './database-s3';
import { JobType, JobStatus } from '@prisma/client';
import crypto from 'crypto';
import { getAWSCredentials, AWS_REGION } from './aws-credentials';
import { BackgroundJobService } from './background-job-service';

// Initialize SQS client with EXPLICIT IAM role credentials
// This bypasses ALL configuration files and SSO settings
const sqsClient = new SQSClient({
  region: AWS_REGION,
  credentials: getAWSCredentials(),
});

// Queue URLs from environment variables
const DOCUMENT_PROCESSING_QUEUE = process.env.SQS_QUEUE_URL || process.env.SQS_DOCUMENT_PROCESSING_QUEUE || 'nolia-document-processing';
const BRAIN_ASSEMBLY_QUEUE = process.env.SQS_DLQ_URL || process.env.SQS_BRAIN_ASSEMBLY_QUEUE || 'nolia-brain-assembly';

export interface DocumentProcessingMessage {
  jobId: string;
  fundId: string;
  documentId: string;
  s3Key: string;
  documentType: 'APPLICATION_FORM' | 'SELECTION_CRITERIA' | 'GOOD_EXAMPLES' | 'OUTPUT_TEMPLATES';
  filename: string;
  mimeType: string;
}

export interface BrainAssemblyMessage {
  jobId: string;
  fundId: string;
  triggerType: 'DOCUMENT_COMPLETE' | 'MANUAL_TRIGGER';
}

export class SQSService {
  /**
   * Create a background job and send document for processing
   */
  async queueDocumentProcessing(fundId: string, documents: Array<{
    id: string;
    s3Key: string;
    documentType: 'APPLICATION_FORM' | 'SELECTION_CRITERIA' | 'GOOD_EXAMPLES' | 'OUTPUT_TEMPLATES';
    filename: string;
    mimeType: string;
  }>) {
    // Get fund to retrieve moduleType
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: { moduleType: true }
    });

    if (!fund) {
      throw new Error(`Fund ${fundId} not found`);
    }

    // Create background job in database WITH moduleType from fund
    const job = await prisma.backgroundJob.create({
      data: {
        fundId,
        type: JobType.DOCUMENT_ANALYSIS,
        status: JobStatus.PENDING,
        totalDocuments: documents.length,
        processedDocuments: 0,
        moduleType: fund.moduleType as any, // Use fund's moduleType
        metadata: {
          documentIds: documents.map(d => d.id),
          queuedAt: new Date().toISOString(),
        },
      },
    });

    // Send messages to SQS queue
    const messages = documents.map(doc => ({
      Id: crypto.randomUUID(),
      MessageBody: JSON.stringify({
        jobId: job.id,
        fundId,
        documentId: doc.id,
        s3Key: doc.s3Key,
        documentType: doc.documentType,
        filename: doc.filename,
        mimeType: doc.mimeType,
      } as DocumentProcessingMessage),
      // Remove FIFO-specific parameters for standard queue
      // MessageGroupId: fundId, // Only for FIFO queues
      // MessageDeduplicationId: `${job.id}-${doc.id}`, // Only for FIFO queues
    }));

    // Send in batches of up to 10 (SQS limit)
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      await sqsClient.send(new SendMessageBatchCommand({
        QueueUrl: DOCUMENT_PROCESSING_QUEUE,
        Entries: batch,
      }));
    }

    // In development, DON'T mark as PROCESSING - let background processor pick it up as PENDING
    // In production with actual SQS queue workers, this line would mark it as PROCESSING
    // For now, background processor will handle jobs in PENDING state within 30 seconds
    console.log(`📝 Job ${job.id} created as PENDING - background processor will pick it up automatically`);

    return job;
  }

  /**
   * Queue brain assembly after document processing completes
   */
  async queueBrainAssembly(fundId: string, triggerType: 'DOCUMENT_COMPLETE' | 'MANUAL_TRIGGER' = 'DOCUMENT_COMPLETE') {
    // Use a transaction to prevent race conditions
    return await prisma.$transaction(async (tx) => {
      // Get fund to retrieve moduleType
      const fund = await tx.fund.findUnique({
        where: { id: fundId },
        select: { moduleType: true }
      });

      if (!fund) {
        throw new Error(`Fund ${fundId} not found`);
      }

      // Check if there's already a brain assembly job (any status)
      const existingJob = await tx.backgroundJob.findFirst({
        where: {
          fundId,
          type: JobType.RAG_PROCESSING,
          status: {
            in: [JobStatus.PENDING, JobStatus.PROCESSING, JobStatus.COMPLETED],
          },
        },
      });

      if (existingJob) {
        console.log(`Brain assembly already exists for fund ${fundId}, job ${existingJob.id} (status: ${existingJob.status})`);
        return existingJob;
      }

      // Create brain assembly job WITH moduleType from fund
      const job = await tx.backgroundJob.create({
        data: {
          fundId,
          type: JobType.RAG_PROCESSING,
          status: JobStatus.PENDING,
          totalDocuments: 1, // Brain assembly is a single operation
          processedDocuments: 0,
          moduleType: fund.moduleType as any, // Use fund's moduleType
          metadata: {
            triggerType,
            queuedAt: new Date().toISOString(),
          },
        },
      });

      console.log(`Created RAG_PROCESSING job ${job.id} for fund ${fundId}`);

      // Send message to brain assembly queue (use same queue for now)
      try {
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: DOCUMENT_PROCESSING_QUEUE, // Use same queue for brain assembly
          MessageBody: JSON.stringify({
            jobId: job.id,
            fundId,
            triggerType,
          } as BrainAssemblyMessage),
          // Remove FIFO-specific parameters for standard queue
          // MessageGroupId: fundId, // Only for FIFO queues
          // MessageDeduplicationId: `brain-${job.id}`, // Only for FIFO queues
        }));
      } catch (sqsError) {
        console.error(`Failed to send SQS message for job ${job.id}:`, sqsError);
        // Don't fail the transaction - the background processor can pick up pending jobs
      }

      return job;
    });
  }

  /**
   * Update job progress (called by processors)
   */
  async updateJobProgress(jobId: string, processedDocuments: number, metadata?: any) {
    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const progress = Math.round((processedDocuments / job.totalDocuments) * 100);
    const isComplete = processedDocuments >= job.totalDocuments;

    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        processedDocuments,
        progress,
        status: isComplete ? JobStatus.COMPLETED : JobStatus.PROCESSING,
        completedAt: isComplete ? new Date() : null,
        metadata: metadata ? { ...job.metadata as any, ...metadata } : job.metadata,
      },
    });

    // If document analysis is complete, trigger brain assembly
    if (isComplete && job.type === JobType.DOCUMENT_ANALYSIS) {
      const ragJob = await this.queueBrainAssembly(job.fundId, 'DOCUMENT_COMPLETE');

      // Immediately trigger RAG processing by calling the service directly
      // This eliminates unreliable HTTP fetch calls between serverless functions
      console.log('🚀 Immediately triggering brain assembly after document completion...');

      // Small delay to ensure database write is committed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Direct function call instead of HTTP fetch - non-blocking
      BackgroundJobService.processRAGJob(ragJob.id)
        .then(() => console.log('✅ Successfully triggered brain assembly for job', ragJob.id))
        .catch(error => console.error('⚠️ Could not immediately trigger brain assembly:', error));
    }

    return { progress, isComplete };
  }

  /**
   * Mark job as failed
   */
  async markJobFailed(jobId: string, errorMessage: string) {
    console.error(`❌ Marking job ${jobId} as failed: ${errorMessage}`);

    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });

    // Log failure for monitoring
    console.error(`🚨 Job ${jobId} failed and requires manual intervention`);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string) {
    return await prisma.backgroundJob.findUnique({
      where: { id: jobId },
      include: {
        fund: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get all jobs for a fund
   */
  async getFundJobs(fundId: string) {
    return await prisma.backgroundJob.findMany({
      where: { fundId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retry a failed job by resetting it to PENDING status
   */
  async retryFailedJob(jobId: string) {
    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== JobStatus.FAILED) {
      throw new Error(`Job ${jobId} is not in FAILED status (current: ${job.status})`);
    }

    // Reset job to PENDING status
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PENDING,
        errorMessage: null,
        completedAt: null,
        processedDocuments: 0,
        progress: 0,
      },
    });

    console.log(`🔄 Job ${jobId} reset to PENDING for retry`);
    return job;
  }
}

export const sqsService = new SQSService();