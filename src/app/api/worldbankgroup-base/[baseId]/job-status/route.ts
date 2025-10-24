import { NextRequest, NextResponse } from 'next/server';
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

    console.log(`📊 [WorldBankGroup] Fetching job status for base: ${baseId}`);

    // Get all jobs for this worldbankgroup base
    const jobs = await prisma.background_jobs.findMany({
      where: {
        fundId: baseId,
        moduleType: 'WORLDBANKGROUP_ADMIN'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get actual document counts from database
    const documentCounts = await prisma.fund_documents.groupBy({
      by: ['documentType'],
      where: {
        fundId: baseId,
        moduleType: 'WORLDBANKGROUP_ADMIN'
      },
      _count: {
        id: true
      }
    });

    // Convert to a more usable format for worldbankgroup bases
    const documentsUploaded = {
      policies: documentCounts.find(d => d.documentType === 'POLICY_DOCUMENT')?._count.id || 0,
      complianceDocs: documentCounts.find(d => d.documentType === 'COMPLIANCE_STANDARD')?._count.id || 0,
      standardTemplates: documentCounts.find(d => d.documentType === 'PROCUREMENT_TEMPLATE')?._count.id || 0,
      governanceRules: documentCounts.find(d => d.documentType === 'PROCUREMENT_RULE')?._count.id || 0,
    };

    // Get individual document details for display
    const documents = await prisma.fund_documents.findMany({
      where: {
        fundId: baseId,
        moduleType: 'WORLDBANKGROUP_ADMIN'
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

    // Get base info
    const base = await prisma.funds.findUnique({
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
        { error: 'WorldBankGroup base not found' },
        { status: 404 }
      );
    }

    // SPECIAL CASE: This specific baseId shows as ACTIVE (completed)
    const isCompletedDemo = baseId === '789befa3-1df7-4a40-a101-a36e3cdfaf0d';

    // Calculate progress based on elapsed time for processing bases
    const totalDocs = Object.values(documentsUploaded).reduce((sum, count) => sum + count, 0);
    const elapsedMinutes = (Date.now() - base.createdAt.getTime()) / (1000 * 60);

    let calculatedProgress = 20; // Start at 20%
    let estimatedTimeRemaining = '20-30 minutes';
    if (!isCompletedDemo) {
      if (elapsedMinutes >= 20) {
        calculatedProgress = 87; // After 20 minutes total (10 + 10)
        estimatedTimeRemaining = '05-10 minutes';
      } else if (elapsedMinutes >= 10) {
        calculatedProgress = 56; // After 10 minutes
        estimatedTimeRemaining = '10-20 minutes';
      }
    }

    // FAKE DEMO: Return PROCESSING or ACTIVE status depending on baseId
    const ragJob = jobs.find(job => job.type === 'DOCUMENT_ANALYSIS') || {
      id: 'fake-job',
      fundId: baseId,
      type: 'DOCUMENT_ANALYSIS',
      status: isCompletedDemo ? 'COMPLETED' : 'PROCESSING',
      progress: isCompletedDemo ? 100 : calculatedProgress,
      processedDocuments: isCompletedDemo ? totalDocs : 0,
      totalDocuments: totalDocs,
      errorMessage: null,
      startedAt: base.createdAt,
      completedAt: isCompletedDemo ? new Date() : null,
      createdAt: base.createdAt,
      updatedAt: new Date(),
      metadata: { fakeDemo: true }
    };

    return NextResponse.json({
      success: true,
      baseId,
      baseName: base.name,
      baseDescription: base.description,
      baseStatus: isCompletedDemo ? 'ACTIVE' : base.status,
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
      overallStatus: isCompletedDemo ? 'active' : 'processing',
      brainBuilding: {
        status: isCompletedDemo ? 'COMPLETED' : 'PROCESSING',
        progress: isCompletedDemo ? 100 : calculatedProgress,
        processedDocuments: isCompletedDemo ? totalDocs : 0,
        totalDocuments: ragJob.totalDocuments,
        startedAt: ragJob.startedAt,
        completedAt: isCompletedDemo ? new Date() : null,
        errorMessage: null,
        currentTask: isCompletedDemo ? 'Knowledge base ready' : 'Analysing compliance requirements...',
        estimatedCompletion: isCompletedDemo ? 'Completed' : estimatedTimeRemaining
      },
      createdAt: base.createdAt.toISOString(),
      fakeDemo: true,
      isCompletedDemo,
      demoNote: isCompletedDemo
        ? 'This knowledge base is ready for use in project assessments.'
        : 'This is a demo environment. Processing status is simulated and will remain in "processing" state.'
    });

  } catch (error) {
    console.error('[WorldBankGroup] Error fetching job status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
