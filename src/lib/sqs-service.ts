import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { prisma } from './database-s3';
import { JobType, JobStatus } from '@prisma/client';
import crypto from 'crypto';

// SQS client configuration - matches S3 client pattern from database-s3.ts
const sqsClient = new SQSClient({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
  // Only use explicit credentials in development when they are intentionally set
  ...(process.env.NODE_ENV === 'development' && 
      process.env.AWS_ACCESS_KEY_ID && 
      process.env.AWS_SECRET_ACCESS_KEY && 
      !process.env.AWS_ACCESS_KEY_ID.startsWith('ASIA') ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  } : {
    // In production or when ASIA credentials are detected, force IAM Role by not providing credentials
  }),
});

// Queue URLs from environment variables
const DOCUMENT_PROCESSING_QUEUE = process.env.SQS_DOCUMENT_PROCESSING_QUEUE || 'nolia-document-processing';
const BRAIN_ASSEMBLY_QUEUE = process.env.SQS_BRAIN_ASSEMBLY_QUEUE || 'nolia-brain-assembly';

export interface DocumentProcessingMessage {
  jobId: string;
  fundId: string;
  documentId: string;
  s3Key: string;
  documentType: 'APPLICATION_FORM' | 'SELECTION_CRITERIA' | 'GOOD_EXAMPLES';
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
    documentType: 'APPLICATION_FORM' | 'SELECTION_CRITERIA' | 'GOOD_EXAMPLES';
    filename: string;
    mimeType: string;
  }>) {
    // Create background job in database
    const job = await prisma.backgroundJob.create({
      data: {
        fundId,
        type: JobType.DOCUMENT_ANALYSIS,
        status: JobStatus.PENDING,
        totalDocuments: documents.length,
        processedDocuments: 0,
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
      MessageGroupId: fundId, // Ensures processing order within fund
      MessageDeduplicationId: `${job.id}-${doc.id}`, // Prevents duplicate processing
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

    // Mark job as processing
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    return job;
  }

  /**
   * Queue brain assembly after document processing completes
   */
  async queueBrainAssembly(fundId: string, triggerType: 'DOCUMENT_COMPLETE' | 'MANUAL_TRIGGER' = 'DOCUMENT_COMPLETE') {
    // Check if there's already a pending brain assembly job
    const existingJob = await prisma.backgroundJob.findFirst({
      where: {
        fundId,
        type: JobType.RAG_PROCESSING,
        status: {
          in: [JobStatus.PENDING, JobStatus.PROCESSING],
        },
      },
    });

    if (existingJob) {
      console.log(`Brain assembly already queued for fund ${fundId}, job ${existingJob.id}`);
      return existingJob;
    }

    // Create brain assembly job
    const job = await prisma.backgroundJob.create({
      data: {
        fundId,
        type: JobType.RAG_PROCESSING,
        status: JobStatus.PENDING,
        totalDocuments: 1, // Brain assembly is a single operation
        processedDocuments: 0,
        metadata: {
          triggerType,
          queuedAt: new Date().toISOString(),
        },
      },
    });

    // Send message to brain assembly queue
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: BRAIN_ASSEMBLY_QUEUE,
      MessageBody: JSON.stringify({
        jobId: job.id,
        fundId,
        triggerType,
      } as BrainAssemblyMessage),
      MessageGroupId: fundId,
      MessageDeduplicationId: `brain-${job.id}`,
    }));

    return job;
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
      await this.queueBrainAssembly(job.fundId, 'DOCUMENT_COMPLETE');
    }

    return { progress, isComplete };
  }

  /**
   * Mark job as failed
   */
  async markJobFailed(jobId: string, errorMessage: string) {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });
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
}

export const sqsService = new SQSService();