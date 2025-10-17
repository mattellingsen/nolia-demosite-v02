import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { prisma } from './database-s3';
import { JobType, JobStatus, ModuleType } from '@prisma/client';
import crypto from 'crypto';
import { getAWSCredentials, AWS_REGION } from './aws-credentials';
import { BackgroundJobService } from './background-job-service';

// DIAGNOSTIC: Log what ModuleType enum values this Prisma client knows about
console.log('🔍 DIAGNOSTIC: ModuleType enum values known by deployed Prisma client:', Object.keys(ModuleType));

// CRITICAL FIX: Create SQS client lazily to ensure Lambda execution role is available
// Do NOT initialize at module level as credentials may not be ready during cold start
let sqsClient: SQSClient | null = null;

function getSQSClient(): SQSClient {
  if (!sqsClient) {
    console.log('🔐 Creating new SQS client with Lambda execution role credentials');
    sqsClient = new SQSClient({
      region: AWS_REGION,
      credentials: getAWSCredentials(), // Returns undefined in production to use Lambda role
    });
  }
  return sqsClient;
}

// Queue URLs from environment variables
const DOCUMENT_PROCESSING_QUEUE = process.env.SQS_QUEUE_URL || process.env.SQS_DOCUMENT_PROCESSING_QUEUE || 'nolia-document-processing';

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
    const fund = await prisma.funds.findUnique({
      where: { id: fundId },
      select: { moduleType: true }
    });

    if (!fund) {
      throw new Error(`Fund ${fundId} not found`);
    }

    // Create background job in database WITH moduleType from fund
    const job = await prisma.background_jobs.create({
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
          // Deployment context for branch routing verification
          deploymentContext: {
            nodeEnv: process.env.NODE_ENV,
            awsBranch: process.env.AWS_BRANCH || 'undefined',
            awsRegion: process.env.AWS_REGION || process.env.NOLIA_AWS_REGION,
            timestamp: new Date().toISOString(),
          },
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 SENDING MESSAGES TO SQS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 Queue URL:', DOCUMENT_PROCESSING_QUEUE);
    console.log('📨 Total messages to send:', messages.length);
    console.log('📨 Number of batches:', Math.ceil(messages.length / batchSize));

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      console.log(`📨 Sending batch ${Math.floor(i / batchSize) + 1} with ${batch.length} message(s)...`);
      console.log('📨 Batch message IDs:', batch.map(m => m.Id).join(', '));

      try {
        const result = await getSQSClient().send(new SendMessageBatchCommand({
          QueueUrl: DOCUMENT_PROCESSING_QUEUE,
          Entries: batch,
        }));

        console.log('✅ Batch sent successfully');
        console.log('✅ Successful:', result.Successful?.length || 0);
        console.log('✅ Failed:', result.Failed?.length || 0);
        if (result.Failed && result.Failed.length > 0) {
          console.error('❌ Failed messages:', JSON.stringify(result.Failed, null, 2));
        }
      } catch (sendError) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ SQS SEND FAILED FOR BATCH');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ Error type:', sendError?.constructor?.name);
        console.error('❌ Error message:', sendError instanceof Error ? sendError.message : String(sendError));
        console.error('❌ Error stack:', sendError instanceof Error ? sendError.stack : 'No stack');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        throw sendError; // Re-throw to be caught by outer try-catch
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL SQS MESSAGES SENT SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // In development, DON'T mark as PROCESSING - let background processor pick it up as PENDING
    // In production with actual SQS queue workers, this line would mark it as PROCESSING
    // For now, background processor will handle jobs in PENDING state within 30 seconds
    console.log(`📝 Job ${job.id} created as PENDING - background processor will pick it up automatically`);

    // In production, immediately trigger document processing (background processor doesn't run in serverless)
    // CRITICAL: Call BackgroundJobService directly to avoid HTTP overhead and connection pool exhaustion
    if (process.env.NODE_ENV === 'production') {
      console.log(`🚀 Triggering immediate document processing for job ${job.id} in production`);

      // Import dynamically to avoid circular dependencies
      import('./background-job-service').then(({ BackgroundJobService }) => {
        // processNextJob will pick up the PENDING job we just created
        BackgroundJobService.processNextJob()
          .then(() => console.log(`✅ Successfully triggered job processing in production`))
          .catch((err: Error) => console.error(`❌ Failed to trigger job processing:`, err));
      }).catch((err: Error) => console.error('❌ Failed to import BackgroundJobService:', err));
    }

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

      // Get DOCUMENT_ANALYSIS job to copy textractJobs metadata to RAG job
      const documentAnalysisJob = await tx.backgroundJob.findFirst({
        where: {
          fundId,
          type: JobType.DOCUMENT_ANALYSIS,
          status: JobStatus.COMPLETED
        },
        orderBy: {
          completedAt: 'desc'
        }
      });

      // Extract textractJobs from DOCUMENT_ANALYSIS job metadata
      const textractJobs = (documentAnalysisJob?.metadata as any)?.textractJobs || {};
      console.log(`📋 Found ${Object.keys(textractJobs).length} textract job(s) from DOCUMENT_ANALYSIS to copy to RAG job`);

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
            textractJobs: textractJobs, // Copy extracted text from DOCUMENT_ANALYSIS job
          },
        },
      });

      console.log(`Created RAG_PROCESSING job ${job.id} for fund ${fundId}`);

      // Send message to brain assembly queue (use same queue for now)
      try {
        await getSQSClient().send(new SendMessageCommand({
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
    const job = await prisma.background_jobs.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const progress = Math.round((processedDocuments / job.totalDocuments) * 100);
    const isComplete = processedDocuments >= job.totalDocuments;

    await prisma.background_jobs.update({
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

    await prisma.background_jobs.update({
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
    return await prisma.background_jobs.findUnique({
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
    return await prisma.background_jobs.findMany({
      where: { fundId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retry a failed job by resetting it to PENDING status
   */
  async retryFailedJob(jobId: string) {
    const job = await prisma.background_jobs.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== JobStatus.FAILED) {
      throw new Error(`Job ${jobId} is not in FAILED status (current: ${job.status})`);
    }

    // Reset job to PENDING status
    await prisma.background_jobs.update({
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