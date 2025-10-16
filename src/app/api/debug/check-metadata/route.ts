import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const fundId = request.nextUrl.searchParams.get('fundId');

  if (!fundId) {
    return NextResponse.json({ error: 'fundId required' }, { status: 400 });
  }

  // Get DOCUMENT_ANALYSIS job
  const docJob = await prisma.backgroundJob.findFirst({
    where: {
      fundId,
      type: 'DOCUMENT_ANALYSIS',
      status: 'COMPLETED'
    },
    orderBy: { completedAt: 'desc' }
  });

  // Get RAG job
  const ragJob = await prisma.backgroundJob.findFirst({
    where: {
      fundId,
      type: 'RAG_PROCESSING'
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get documents
  const docs = await prisma.document.findMany({
    where: { fundId },
    select: { id: true, filename: true }
  });

  return NextResponse.json({
    documentAnalysisJob: {
      id: docJob?.id,
      textractJobs: (docJob?.metadata as any)?.textractJobs || {},
      textractJobCount: Object.keys((docJob?.metadata as any)?.textractJobs || {}).length
    },
    ragJob: {
      id: ragJob?.id,
      textractJobs: (ragJob?.metadata as any)?.textractJobs || {},
      textractJobCount: Object.keys((ragJob?.metadata as any)?.textractJobs || {}).length
    },
    documents: docs
  });
}
