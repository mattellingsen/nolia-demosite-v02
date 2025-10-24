import { NextRequest, NextResponse } from 'next/server';
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

    console.log(`📊 [WorldBankGroup Projects] Fetching job status for project: ${projectId}`);

    const jobs = await prisma.background_jobs.findMany({
      where: {
        fundId: projectId,
        moduleType: 'WORLDBANKGROUP'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const documentCounts = await prisma.fund_documents.groupBy({
      by: ['documentType'],
      where: {
        fundId: projectId,
        moduleType: 'WORLDBANKGROUP'
      },
      _count: {
        id: true
      }
    });

    const documentsUploaded = {
      preRfpFiles: documentCounts.find(d => d.documentType === 'APPLICATION_FORM')?._count.id || 0,
      rfpFiles: documentCounts.find(d => d.documentType === 'SELECTION_CRITERIA')?._count.id || 0,
      supportingFiles: documentCounts.find(d => d.documentType === 'GOOD_EXAMPLES')?._count.id || 0,
      outputTemplatesFiles: documentCounts.find(d => d.documentType === 'OUTPUT_TEMPLATES')?._count.id || 0,
    };

    const documents = await prisma.fund_documents.findMany({
      where: {
        fundId: projectId,
        moduleType: 'WORLDBANKGROUP'
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

    const project = await prisma.funds.findUnique({
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
        { error: 'WorldBankGroup project not found' },
        { status: 404 }
      );
    }

    // FAKE DEMO: Always return PROCESSING status
    const ragJob = jobs.find(job => job.type === 'DOCUMENT_ANALYSIS') || {
      id: 'fake-job',
      fundId: projectId,
      type: 'DOCUMENT_ANALYSIS',
      status: 'PROCESSING',
      progress: 45,
      processedDocuments: 0,
      totalDocuments: Object.values(documentsUploaded).reduce((sum, count) => sum + count, 0),
      errorMessage: null,
      startedAt: project.createdAt,
      completedAt: null,
      createdAt: project.createdAt,
      updatedAt: new Date(),
      metadata: { fakeDemo: true }
    };

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
      overallStatus: 'processing',
      brainBuilding: {
        status: 'PROCESSING',
        progress: 45,
        processedDocuments: 0,
        totalDocuments: ragJob.totalDocuments,
        startedAt: ragJob.startedAt,
        completedAt: null,
        errorMessage: null,
        currentTask: 'Processing project documents...',
        estimatedCompletion: '20-30 minutes'
      },
      createdAt: project.createdAt.toISOString(),
      fakeDemo: true,
      demoNote: 'This is a demo environment. Processing status is simulated and will remain in "processing" state.'
    });

  } catch (error) {
    console.error('[WorldBankGroup Projects] Error fetching job status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
