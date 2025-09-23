import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { FundStatus, JobStatus } from '@prisma/client';

/**
 * Emergency endpoint to manually complete stuck funds
 * Use this for production issues where background processing fails
 */
export async function POST(request: NextRequest, { params }: { params: { fundId: string } }) {
  try {
    const { fundId } = params;

    if (!fundId) {
      return NextResponse.json({
        error: 'Fund ID is required'
      }, { status: 400 });
    }

    // Get fund and current jobs
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        backgroundJobs: {
          where: {
            status: {
              in: [JobStatus.PENDING, JobStatus.PROCESSING]
            }
          }
        }
      }
    });

    if (!fund) {
      return NextResponse.json({
        error: 'Fund not found'
      }, { status: 404 });
    }

    console.log(`🚨 EMERGENCY: Force completing fund ${fundId} - ${fund.backgroundJobs.length} stuck jobs`);

    // Complete all pending/processing jobs for this fund
    const updateResults = [];

    for (const job of fund.backgroundJobs) {
      const updatedJob = await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          progress: 100,
          processedDocuments: job.totalDocuments || 1,
          completedAt: new Date(),
          metadata: {
            ...job.metadata as any,
            forceCompleted: true,
            forceCompletedAt: new Date().toISOString(),
            reason: 'Emergency completion due to infrastructure issues'
          }
        }
      });

      updateResults.push({
        jobId: job.id,
        type: job.type,
        oldStatus: job.status,
        newStatus: 'COMPLETED'
      });

      console.log(`✅ Force completed job ${job.id} (${job.type})`);
    }

    // Update fund status if it's still in DRAFT
    let fundUpdated = false;
    if (fund.status === FundStatus.DRAFT) {
      await prisma.fund.update({
        where: { id: fundId },
        data: {
          status: FundStatus.ACTIVE,
          updatedAt: new Date()
        }
      });
      fundUpdated = true;
      console.log(`✅ Updated fund ${fundId} status to ACTIVE`);
    }

    // Create audit log for this emergency action
    await prisma.auditLog.create({
      data: {
        action: 'EMERGENCY_FORCE_COMPLETE',
        resourceType: 'Fund',
        resourceId: fundId,
        metadata: {
          completedJobs: updateResults,
          fundStatusUpdated: fundUpdated,
          timestamp: new Date().toISOString(),
          reason: 'Production infrastructure missing - SQS/Lambda not deployed'
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Emergency completion successful for fund ${fund.name}`,
      completedJobs: updateResults.length,
      fundStatusUpdated,
      details: updateResults
    });

  } catch (error) {
    console.error('❌ Emergency completion failed:', error);
    return NextResponse.json({
      error: 'Failed to complete fund',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}