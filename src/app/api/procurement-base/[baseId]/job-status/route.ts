import { NextRequest, NextResponse } from 'next/server';
import { BackgroundJobService } from '@/lib/background-job-service';
import { prisma } from '@/lib/database-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ baseId: string }> }
) {
  try {
    const { baseId } = await params;

    if (!baseId) {
      return NextResponse.json(
        { error: 'Base ID is required' },
        { status: 400 }
      );
    }

    // Get all jobs for this procurement base
    const jobs = await BackgroundJobService.getFundJobs(baseId);

    // Get actual document counts from database
    const documentCounts = await prisma.fundDocument.groupBy({
      by: ['documentType'],
      where: {
        fundId: baseId,
        moduleType: 'PROCUREMENT_ADMIN'
      },
      _count: {
        id: true
      }
    });

    // Convert to a more usable format for procurement bases
    const documentsUploaded = {
      policies: documentCounts.find(d => d.documentType === 'APPLICATION_FORM')?._count.id || 0,
      complianceDocs: documentCounts.find(d => d.documentType === 'SELECTION_CRITERIA')?._count.id || 0,
      standardTemplates: documentCounts.find(d => d.documentType === 'GOOD_EXAMPLES')?._count.id || 0,
      governanceRules: documentCounts.find(d => d.documentType === 'OUTPUT_TEMPLATES')?._count.id || 0,
    };

    // Check if base has a brain already
    const base = await prisma.fund.findUnique({
      where: { id: baseId },
      select: {
        fundBrain: true,
        brainAssembledAt: true,
        status: true,
        name: true,
        description: true,
        createdAt: true,
        moduleType: true
      }
    });

    if (!base) {
      return NextResponse.json(
        { error: 'Procurement base not found' },
        { status: 404 }
      );
    }

    // Get overall status
    let ragJob = jobs.find(job => job.type === 'RAG_PROCESSING');

    // AUTO-TRIGGER: Check if we have a pending RAG job that should be triggered
    if (ragJob && ragJob.status === 'PENDING') {
      const jobAge = Date.now() - new Date(ragJob.createdAt).getTime();

      // If job is older than 5 seconds, trigger it automatically
      if (jobAge > 5000) {
        console.log(`🚀 Auto-triggering stale PENDING RAG job ${ragJob.id} from job-status endpoint`);

        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'https://main.d2l8hlr3sei3te.amplifyapp.com';
          const assemblyUrl = `${baseUrl}/api/procurement-brain/${baseId}/assemble`;

          // Fire and forget - don't await
          fetch(assemblyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).then(response => {
            if (response.ok) {
              console.log(`✅ Successfully triggered brain assembly for ${baseId}`);
            } else {
              console.error(`❌ Failed to trigger brain assembly: ${response.status}`);
            }
          }).catch(error => {
            console.error(`❌ Error triggering brain assembly:`, error);
          });
        } catch (error) {
          console.error(`❌ Exception triggering brain assembly:`, error);
        }
      }
    }

    // If no RAG job but fundBrain exists, create a virtual completed job
    if (!ragJob && base?.fundBrain) {
      ragJob = {
        id: 'virtual-completed',
        fundId: baseId,
        type: 'RAG_PROCESSING',
        status: 'COMPLETED',
        progress: 100,
        processedDocuments: Object.values(documentsUploaded).reduce((sum, count) => sum + count, 0),
        totalDocuments: Object.values(documentsUploaded).reduce((sum, count) => sum + count, 0),
        errorMessage: null,
        startedAt: base.brainAssembledAt,
        completedAt: base.brainAssembledAt,
        createdAt: base.brainAssembledAt,
        updatedAt: base.brainAssembledAt,
        metadata: { virtualJob: true, reason: 'Brain already assembled' }
      };
      jobs.push(ragJob);
    }

    const overallStatus = getOverallStatus(jobs);

    return NextResponse.json({
      success: true,
      baseId,
      baseName: base.name,
      baseDescription: base.description,
      baseStatus: base.status,
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
      brainBuilding: ragJob ? {
        status: ragJob.status,
        progress: ragJob.progress,
        processedDocuments: ragJob.processedDocuments,
        totalDocuments: ragJob.totalDocuments,
        startedAt: ragJob.startedAt,
        completedAt: ragJob.completedAt,
        errorMessage: ragJob.errorMessage,
        currentTask: getCurrentTask(ragJob),
        estimatedCompletion: getEstimatedCompletion(ragJob)
      } : null,
      createdAt: base.createdAt.toISOString()
    });

  } catch (error) {
    console.error('Error fetching procurement base job status:', error);
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

function getCurrentTask(ragJob: any): string {
  if (!ragJob) return 'Waiting to start...';

  const progress = ragJob.progress || 0;

  if (ragJob.status === 'COMPLETED') {
    return 'Base configuration complete';
  }

  if (ragJob.status === 'FAILED') {
    return 'Processing failed';
  }

  // Map progress to tasks
  if (progress < 20) return 'Processing policy documents...';
  if (progress < 40) return 'Analysing compliance requirements...';
  if (progress < 60) return 'Organising standard templates...';
  if (progress < 80) return 'Mapping governance workflows...';
  if (progress < 95) return 'Building knowledge base...';
  return 'Finalising configuration...';
}

function getEstimatedCompletion(ragJob: any): string | undefined {
  if (!ragJob || ragJob.status === 'COMPLETED' || ragJob.status === 'FAILED') {
    return undefined;
  }

  const progress = ragJob.progress || 0;

  if (progress < 20) return '5-8 minutes';
  if (progress < 40) return '4-6 minutes';
  if (progress < 60) return '3-4 minutes';
  if (progress < 80) return '2-3 minutes';
  if (progress < 95) return '1-2 minutes';
  return 'Less than 1 minute';
}