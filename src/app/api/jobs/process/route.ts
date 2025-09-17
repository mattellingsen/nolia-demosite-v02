import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/database-s3';
import { sqsService } from '@/lib/sqs-service';
import { analyzeApplicationForm, analyzeSelectionCriteria } from '@/utils/server-document-analyzer';
import { analyzeGoodExamplesWithClaude } from '@/utils/claude-document-reasoner';
import { JobStatus, JobType } from '@prisma/client';

// S3 client configuration - matches pattern from other files
const s3Client = new S3Client({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
  ...(process.env.NODE_ENV === 'development' && 
      process.env.AWS_ACCESS_KEY_ID && 
      process.env.AWS_SECRET_ACCESS_KEY && 
      !process.env.AWS_ACCESS_KEY_ID.startsWith('ASIA') ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  } : {}),
});

const S3_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'nolia-funding-documents-599065966827';

/**
 * Simulate document processing from SQS queue
 * In production, this would be a Lambda function triggered by SQS
 */
export async function POST(request: NextRequest) {
  try {
    const { jobId, documentId, force = false } = await request.json();

    if (!jobId && !documentId && !force) {
      return NextResponse.json({
        error: 'Either jobId, documentId, or force=true is required'
      }, { status: 400 });
    }

    let processedJobs = 0;
    let processedDocuments = 0;

    if (force) {
      // Process all pending document analysis jobs
      const pendingJobs = await prisma.backgroundJob.findMany({
        where: {
          type: JobType.DOCUMENT_ANALYSIS,
          status: {
            in: [JobStatus.PENDING, JobStatus.PROCESSING]
          }
        },
        include: {
          fund: {
            include: {
              documents: true
            }
          }
        }
      });

      for (const job of pendingJobs) {
        try {
          const result = await processDocumentAnalysisJob(job);
          processedJobs++;
          processedDocuments += result.documentsProcessed;
        } catch (error) {
          console.error(`Failed to process job ${job.id}:`, error);
          await sqsService.markJobFailed(job.id, error instanceof Error ? error.message : 'Unknown error');
        }
      }

    } else if (jobId) {
      // Process specific job
      const job = await prisma.backgroundJob.findUnique({
        where: { id: jobId },
        include: {
          fund: {
            include: {
              documents: true
            }
          }
        }
      });

      if (!job) {
        return NextResponse.json({
          error: 'Job not found'
        }, { status: 404 });
      }

      const result = await processDocumentAnalysisJob(job);
      processedJobs = 1;
      processedDocuments = result.documentsProcessed;

    } else if (documentId) {
      // Process specific document
      const document = await prisma.fundDocument.findUnique({
        where: { id: documentId },
        include: {
          fund: true
        }
      });

      if (!document) {
        return NextResponse.json({
          error: 'Document not found'
        }, { status: 404 });
      }

      await processDocument(document);
      processedDocuments = 1;
    }

    return NextResponse.json({
      success: true,
      processedJobs,
      processedDocuments,
      message: `Processed ${processedJobs} jobs and ${processedDocuments} documents`
    });

  } catch (error) {
    console.error('Error processing jobs:', error);
    return NextResponse.json({
      error: 'Failed to process jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processDocumentAnalysisJob(job: any) {
  console.log(`Processing document analysis job: ${job.id}`);

  // Get documents for this job
  const jobMetadata = job.metadata as any;
  const documentIds = jobMetadata?.documentIds || [];
  
  const documents = await prisma.fundDocument.findMany({
    where: {
      id: { in: documentIds },
      fundId: job.fundId
    },
    include: {
      fund: true
    }
  });

  let processedCount = 0;

  // Process each document
  for (const document of documents) {
    try {
      await processDocument(document);
      processedCount++;
      
      // Update job progress
      await sqsService.updateJobProgress(job.id, processedCount, {
        lastProcessedDocument: document.id,
        lastProcessedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Failed to process document ${document.id}:`, error);
      await sqsService.markJobFailed(job.id, `Failed to process document ${document.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // After all documents are processed, trigger brain assembly
  if (processedCount === documents.length) {
    try {
      console.log(`All documents processed for job ${job.id}, triggering brain assembly...`);
      await triggerBrainAssembly(job.fundId);
    } catch (error) {
      console.error(`Brain assembly failed for fund ${job.fundId}:`, error);
      // Don't fail the entire job if brain assembly fails - it can be retried separately
    }
  }

  return { documentsProcessed: processedCount };
}

async function processDocument(document: any) {
  console.log(`Processing document: ${document.filename} (${document.documentType})`);

  // Download document from S3
  const getCommand = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: document.s3Key
  });

  const s3Response = await s3Client.send(getCommand);
  const documentBuffer = Buffer.from(await s3Response.Body!.transformToByteArray());

  // Create File-like object for analysis functions
  const fileObject = {
    arrayBuffer: async () => documentBuffer.buffer,
    name: document.filename,
    type: document.mimeType,
    size: document.fileSize
  };

  let analysisResult;

  // Process based on document type
  switch (document.documentType) {
    case 'APPLICATION_FORM':
      analysisResult = await analyzeApplicationForm(fileObject as File);
      
      // Update fund with application form analysis
      await prisma.fund.update({
        where: { id: document.fundId },
        data: {
          applicationFormAnalysis: analysisResult
        }
      });
      break;

    case 'SELECTION_CRITERIA':
      analysisResult = await analyzeSelectionCriteria([fileObject as File]);
      
      // Update fund with selection criteria analysis
      await prisma.fund.update({
        where: { id: document.fundId },
        data: {
          selectionCriteriaAnalysis: analysisResult
        }
      });
      break;

    case 'GOOD_EXAMPLES':
      // Get selection criteria for context
      const fund = await prisma.fund.findUnique({
        where: { id: document.fundId }
      });
      
      const selectionCriteriaAnalysis = fund?.selectionCriteriaAnalysis as any;
      analysisResult = await analyzeGoodExamplesWithClaude([fileObject as File], selectionCriteriaAnalysis);
      
      // Update fund with good examples analysis
      await prisma.fund.update({
        where: { id: document.fundId },
        data: {
          goodExamplesAnalysis: analysisResult
        }
      });
      break;

    default:
      throw new Error(`Unknown document type: ${document.documentType}`);
  }

  console.log(`Completed processing ${document.filename}: ${document.documentType}`);
  return analysisResult;
}

/**
 * Trigger brain assembly after all documents are processed
 */
async function triggerBrainAssembly(fundId: string) {
  try {
    console.log(`Triggering brain assembly for fund: ${fundId}`);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/brain/${fundId}/assemble`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to assemble brain');
    }

    const result = await response.json();
    console.log(`Brain assembly completed for fund: ${fundId}, version: ${result.brain.version}`);
    
    return result;
  } catch (error) {
    console.error(`Failed to assemble brain for fund ${fundId}:`, error);
    throw error;
  }
}

// GET endpoint to check processing status and pending jobs
export async function GET() {
  try {
    const pendingJobs = await prisma.backgroundJob.findMany({
      where: {
        status: {
          in: [JobStatus.PENDING, JobStatus.PROCESSING]
        }
      },
      include: {
        fund: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const completedJobs = await prisma.backgroundJob.count({
      where: {
        status: JobStatus.COMPLETED
      }
    });

    const failedJobs = await prisma.backgroundJob.count({
      where: {
        status: JobStatus.FAILED
      }
    });

    return NextResponse.json({
      success: true,
      pendingJobs: pendingJobs.length,
      completedJobs,
      failedJobs,
      jobs: pendingJobs.map(job => ({
        id: job.id,
        fundId: job.fundId,
        fundName: job.fund.name,
        type: job.type,
        status: job.status,
        progress: job.progress,
        processedDocuments: job.processedDocuments,
        totalDocuments: job.totalDocuments,
        createdAt: job.createdAt
      }))
    });

  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json({
      error: 'Failed to get job status'
    }, { status: 500 });
  }
}