import { NextRequest, NextResponse } from 'next/server';
import { sqsService } from '@/lib/sqs-service';
import { prisma } from '@/lib/database-s3';

interface RouteParams {
  params: {
    jobId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({
        error: 'Job ID is required'
      }, { status: 400 });
    }

    // Get job status using SQS service
    const job = await sqsService.getJobStatus(jobId);

    if (!job) {
      return NextResponse.json({
        error: 'Job not found'
      }, { status: 404 });
    }

    // Calculate estimated completion time if job is in progress
    let estimatedCompletion = null;
    if (job.status === 'PROCESSING' && job.startedAt && job.processedDocuments > 0) {
      const timeElapsed = Date.now() - new Date(job.startedAt).getTime();
      const timePerDocument = timeElapsed / job.processedDocuments;
      const remainingDocuments = job.totalDocuments - job.processedDocuments;
      const estimatedRemainingTime = remainingDocuments * timePerDocument;
      estimatedCompletion = new Date(Date.now() + estimatedRemainingTime).toISOString();
    }

    // Get fund brain status if this is a completed document analysis job
    let brainStatus = null;
    if (job.type === 'DOCUMENT_ANALYSIS' && job.status === 'COMPLETED') {
      const fund = await prisma.fund.findUnique({
        where: { id: job.fundId },
        select: {
          fundBrain: true,
          brainVersion: true,
          brainAssembledAt: true
        }
      });

      brainStatus = {
        assembled: !!fund?.fundBrain,
        version: fund?.brainVersion || 0,
        assembledAt: fund?.brainAssembledAt
      };
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        fundId: job.fundId,
        fundName: job.fund?.name,
        type: job.type,
        status: job.status,
        progress: job.progress,
        processedDocuments: job.processedDocuments,
        totalDocuments: job.totalDocuments,
        errorMessage: job.errorMessage,
        metadata: job.metadata,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        estimatedCompletion,
        brainStatus
      }
    });

  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json({
      error: 'Failed to get job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT endpoint to update job status (for processors)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const { processedDocuments, metadata, status, errorMessage } = await request.json();

    if (!jobId) {
      return NextResponse.json({
        error: 'Job ID is required'
      }, { status: 400 });
    }

    if (status === 'FAILED' && errorMessage) {
      await sqsService.markJobFailed(jobId, errorMessage);
    } else if (processedDocuments !== undefined) {
      await sqsService.updateJobProgress(jobId, processedDocuments, metadata);
    }

    const updatedJob = await sqsService.getJobStatus(jobId);

    return NextResponse.json({
      success: true,
      job: updatedJob
    });

  } catch (error) {
    console.error('Error updating job status:', error);
    return NextResponse.json({
      error: 'Failed to update job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}