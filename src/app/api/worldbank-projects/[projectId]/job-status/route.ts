import { NextRequest, NextResponse } from 'next/server';
import { BackgroundJobService } from '@/lib/background-job-service';
import { prisma } from '@/lib/database-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get all jobs for this worldbank project
    const jobs = await BackgroundJobService.getFundJobs(projectId);

    // Get actual document counts from database
    const documentCounts = await prisma.fundDocument.groupBy({
      by: ['documentType'],
      where: {
        fundId: projectId,
        moduleType: 'WORLDBANK'
      },
      _count: {
        id: true
      }
    });

    // Convert to a more usable format for worldbank projects (4-step structure)
    const documentsUploaded = {
      preRfpDocs: documentCounts.find(d => d.documentType === 'APPLICATION_FORM')?._count.id || 0,
      rfpDocs: documentCounts.find(d => d.documentType === 'SELECTION_CRITERIA')?._count.id || 0,
      supportingDocs: documentCounts.find(d => d.documentType === 'GOOD_EXAMPLES')?._count.id || 0,
      outputTemplates: documentCounts.find(d => d.documentType === 'OUTPUT_TEMPLATES')?._count.id || 0,
    };

    // Get individual document details for display
    const documents = await prisma.fundDocument.findMany({
      where: {
        fundId: projectId,
        moduleType: 'WORLDBANK'
      },
      select: {
        id: true,
        filename: true,
        fileSize: true,
        mimeType: true,
        documentType: true,
        uploadedAt: true
      },
      orderBy: {
        uploadedAt: 'asc'
      }
    });

    // Check if project has a brain already
    const project = await prisma.fund.findUnique({
      where: { id: projectId },
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

    if (!project) {
      return NextResponse.json(
        { error: 'Worldbank project not found' },
        { status: 404 }
      );
    }

    // Get overall status
    let ragJob = jobs.find(job => job.type === 'RAG_PROCESSING');

    // AUTO-TRIGGER: Check if we have a pending/completed RAG job that needs brain assembly
    if (ragJob && (ragJob.status === 'PENDING' || ragJob.status === 'COMPLETED')) {
      const jobAge = Date.now() - new Date(ragJob.createdAt).getTime();

      // If RAG job is PENDING and older than 1 second, OR if COMPLETED but fundBrain is NULL, trigger brain assembly
      const shouldTrigger = (ragJob.status === 'PENDING' && jobAge > 1000) ||
                           (ragJob.status === 'COMPLETED' && !project?.fundBrain);

      if (shouldTrigger) {
        const reason = ragJob.status === 'PENDING' ? `stale PENDING RAG job (${Math.round(jobAge/1000)}s old)` :
                      'COMPLETED RAG job but fundBrain is NULL';
        console.log(`🚀 Auto-triggering brain assembly for ${reason} - ${ragJob.id}`);

        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'https://main.d2l8hlr3sei3te.amplifyapp.com';
          const assemblyUrl = `${baseUrl}/api/worldbank-brain/${projectId}/assemble`;

          // Fire and forget - don't await
          fetch(assemblyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).then(response => {
            if (response.ok) {
              console.log(`✅ Successfully triggered brain assembly for project ${projectId}`);
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
    if (!ragJob && project?.fundBrain) {
      ragJob = {
        id: 'virtual-completed',
        fundId: projectId,
        type: 'RAG_PROCESSING',
        status: 'COMPLETED',
        progress: 100,
        processedDocuments: Object.values(documentsUploaded).reduce((sum, count) => sum + count, 0),
        totalDocuments: Object.values(documentsUploaded).reduce((sum, count) => sum + count, 0),
        errorMessage: null,
        startedAt: project.brainAssembledAt,
        completedAt: project.brainAssembledAt,
        createdAt: project.brainAssembledAt,
        updatedAt: project.brainAssembledAt,
        metadata: { virtualJob: true, reason: 'Brain already assembled' }
      };
      jobs.push(ragJob);
    }

    const overallStatus = getOverallStatus(jobs);

    return NextResponse.json({
      success: true,
      projectId,
      projectName: project.name,
      projectDescription: project.description,
      projectStatus: project.status,
      documentsUploaded,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        documentType: doc.documentType,
        uploadedAt: doc.uploadedAt.toISOString()
      })),
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
      createdAt: project.createdAt.toISOString()
    });

  } catch (error) {
    console.error('Error fetching worldbank project job status:', error);
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
    return 'Project knowledgebase complete';
  }

  if (ragJob.status === 'FAILED') {
    return 'Processing failed';
  }

  // Map progress to tasks (project-specific messaging)
  if (progress < 20) return 'Processing pre-RFP documents...';
  if (progress < 40) return 'Analysing RFP requirements...';
  if (progress < 60) return 'Reviewing supporting documentation...';
  if (progress < 80) return 'Integrating output templates...';
  if (progress < 95) return 'Building project knowledgebase...';
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
