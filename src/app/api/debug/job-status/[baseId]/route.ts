import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { baseId: string } }
) {
  try {
    const { baseId } = params;

    // Get fund and base info
    const fund = await prisma.funds.findFirst({
      where: { worldbankBaseId: baseId },
      include: {
        worldbankBase: {
          include: {
            documents: true,
          },
        },
      },
    });

    if (!fund) {
      return NextResponse.json({ error: 'Fund not found for baseId' }, { status: 404 });
    }

    // Get background job
    const job = await prisma.background_jobs.findFirst({
      where: { fundId: fund.id },
      orderBy: { createdAt: 'desc' },
    });

    // Get SQS queue status
    const response = await fetch(
      `https://sqs.ap-southeast-2.amazonaws.com/599065966827/nolia-document-processing?Action=GetQueueAttributes&AttributeName.1=ApproximateNumberOfMessages&AttributeName.2=ApproximateNumberOfMessagesNotVisible`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const sqsData = await response.text();

    return NextResponse.json({
      baseId,
      fund: {
        id: fund.id,
        name: fund.name,
        moduleType: fund.moduleType,
        createdAt: fund.createdAt,
      },
      base: {
        id: fund.worldbankBase?.id,
        status: fund.worldbankBase?.status,
        createdAt: fund.worldbankBase?.createdAt,
        updatedAt: fund.worldbankBase?.updatedAt,
        documentCount: fund.worldbankBase?.fund_documents.length,
      },
      documents: fund.worldbankBase?.fund_documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        documentType: doc.documentType,
        s3Key: doc.s3Key,
        uploadedAt: doc.uploadedAt,
      })),
      job: job ? {
        id: job.id,
        status: job.status,
        processedDocuments: job.processedDocuments,
        totalDocuments: job.totalDocuments,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      } : null,
      sqsQueue: sqsData.includes('ApproximateNumberOfMessages') ? 'Has messages' : 'Empty or error',
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Failed to fetch job status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
