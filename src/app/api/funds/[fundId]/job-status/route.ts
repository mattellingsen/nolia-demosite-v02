import { NextRequest, NextResponse } from 'next/server';
import { BackgroundJobService } from '@/lib/background-job-service';
import { prisma } from '@/lib/database-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;
    
    if (!fundId) {
      return NextResponse.json(
        { error: 'Fund ID is required' },
        { status: 400 }
      );
    }

    // Get all jobs for this fund
    const jobs = await BackgroundJobService.getFundJobs(fundId);
    
    // Get actual document counts by type from database
    const documentCounts = await prisma.fundDocument.groupBy({
      by: ['documentType'],
      where: { fundId },
      _count: {
        id: true
      }
    });
    
    // Convert to a more usable format
    const documentsUploaded = {
      applicationForm: documentCounts.find(d => d.documentType === 'APPLICATION_FORM')?._count.id > 0 || false,
      selectionCriteria: documentCounts.find(d => d.documentType === 'SELECTION_CRITERIA')?._count.id || 0,
      goodExamples: documentCounts.find(d => d.documentType === 'GOOD_EXAMPLES')?._count.id || 0,
      outputTemplates: documentCounts.find(d => d.documentType === 'OUTPUT_TEMPLATES')?._count.id || 0,
    };
    
    // Get overall status
    const ragJob = jobs.find(job => job.type === 'RAG_PROCESSING');
    const overallStatus = getOverallStatus(jobs);
    
    return NextResponse.json({
      success: true,
      fundId,
      documentsUploaded,
      jobs: jobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        processedDocuments: job.processedDocuments,
        totalDocuments: job.totalDocuments,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      })),
      overallStatus,
      ragProcessing: ragJob ? {
        status: ragJob.status,
        progress: ragJob.progress,
        processedDocuments: ragJob.processedDocuments,
        totalDocuments: ragJob.totalDocuments,
        startedAt: ragJob.startedAt,
        completedAt: ragJob.completedAt,
        errorMessage: ragJob.errorMessage
      } : null
    });

  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getOverallStatus(jobs: any[]): 'pending' | 'processing' | 'completed' | 'failed' | 'partial' {
  if (jobs.length === 0) return 'pending';
  
  const statuses = jobs.map(job => job.status);
  
  if (statuses.every(status => status === 'COMPLETED')) return 'completed';
  if (statuses.some(status => status === 'FAILED')) return 'failed';
  if (statuses.some(status => status === 'PROCESSING')) return 'processing';
  if (statuses.some(status => status === 'COMPLETED')) return 'partial';
  
  return 'pending';
}