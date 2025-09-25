import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

export async function POST(
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

    // Check if fund exists
    const fund = await prisma.fund.findUnique({
      where: { id: fundId }
    });

    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      );
    }

    // Find any failed background jobs for this fund
    const failedJobs = await prisma.backgroundJob.findMany({
      where: {
        fundId,
        status: 'FAILED'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (failedJobs.length === 0) {
      return NextResponse.json(
        { error: 'No failed jobs found for this fund' },
        { status: 404 }
      );
    }

    // Reset the most recent failed job to pending
    const latestFailedJob = failedJobs[0];

    await prisma.backgroundJob.update({
      where: { id: latestFailedJob.id },
      data: {
        status: 'PENDING',
        progress: 0,
        processedDocuments: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        updatedAt: new Date()
      }
    });

    // Trigger processing by calling the process endpoint
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/jobs/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: latestFailedJob.id,
          retry: true
        })
      });

      if (!response.ok) {
        console.warn('Failed to trigger immediate processing, job will be picked up automatically');
      }
    } catch (fetchError) {
      console.warn('Could not trigger immediate processing:', fetchError);
      // Job will still be retried by the background processor
    }

    return NextResponse.json({
      success: true,
      message: 'Processing retry initiated. AI analysis will be attempted again.',
      jobId: latestFailedJob.id,
      fundId
    });

  } catch (error) {
    console.error('Error retrying fund processing:', error);
    return NextResponse.json(
      {
        error: 'Failed to retry processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}