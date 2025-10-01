import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { JobStatus, JobType } from '@prisma/client';
import { ensureStartup } from '@/lib/startup';

/**
 * Production-specific endpoint to process stuck background jobs
 * This is designed for serverless environments where the background processor
 * might not run continuously
 */
export async function POST(request: NextRequest) {
  try {
    // Ensure background processor is started
    ensureStartup();

    console.log('🔧 Production job processor: Starting manual job processing...');

    // Find all stuck or pending jobs
    const stuckJobs = await prisma.backgroundJob.findMany({
      where: {
        OR: [
          {
            // Jobs that are processing but stuck at 0% for more than 2 minutes
            status: JobStatus.PROCESSING,
            processedDocuments: 0,
            startedAt: {
              lt: new Date(Date.now() - 2 * 60 * 1000)
            }
          },
          {
            // Jobs that are pending for more than 5 minutes
            status: JobStatus.PENDING,
            createdAt: {
              lt: new Date(Date.now() - 5 * 60 * 1000)
            }
          }
        ]
      },
      include: {
        fund: {
          select: {
            id: true,
            name: true,
            moduleType: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (stuckJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck jobs found',
        processed: 0
      });
    }

    console.log(`🔧 Found ${stuckJobs.length} stuck job(s) to process`);

    const results = [];

    for (const job of stuckJobs) {
      try {
        console.log(`📋 Processing stuck ${job.type} job: ${job.id} for ${job.fund?.moduleType} "${job.fund?.name}"`);

        let response;

        if (job.type === JobType.RAG_PROCESSING) {
          // Trigger brain assembly
          response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/brain/${job.fundId}/assemble`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } else {
          // Trigger document processing
          response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/jobs/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jobId: job.id,
              autoTrigger: true,
              productionProcessor: true
            }),
          });
        }

        if (response.ok) {
          const result = await response.json();
          results.push({
            jobId: job.id,
            status: 'success',
            fundName: job.fund?.name,
            moduleType: job.fund?.moduleType,
            message: result.message || 'Processed successfully'
          });
          console.log(`✅ Successfully processed ${job.fund?.moduleType} job ${job.id}`);
        } else {
          const errorText = await response.text();
          results.push({
            jobId: job.id,
            status: 'error',
            fundName: job.fund?.name,
            moduleType: job.fund?.moduleType,
            error: `HTTP ${response.status}: ${errorText}`
          });
          console.error(`❌ Failed to process ${job.fund?.moduleType} job ${job.id}: ${response.status} ${errorText}`);
        }

      } catch (error) {
        results.push({
          jobId: job.id,
          status: 'error',
          fundName: job.fund?.name,
          moduleType: job.fund?.moduleType,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`❌ Error processing ${job.fund?.moduleType} job ${job.id}:`, error);
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`🎉 Production job processor completed: ${successCount} successful, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `Processed ${stuckJobs.length} stuck jobs: ${successCount} successful, ${errorCount} errors`,
      processed: successCount,
      errors: errorCount,
      results
    });

  } catch (error) {
    console.error('❌ Production job processor error:', error);
    return NextResponse.json({
      error: 'Failed to process stuck jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check for stuck jobs without processing them
 */
export async function GET() {
  try {
    const stuckJobs = await prisma.backgroundJob.findMany({
      where: {
        OR: [
          {
            status: JobStatus.PROCESSING,
            processedDocuments: 0,
            startedAt: {
              lt: new Date(Date.now() - 2 * 60 * 1000)
            }
          },
          {
            status: JobStatus.PENDING,
            createdAt: {
              lt: new Date(Date.now() - 5 * 60 * 1000)
            }
          }
        ]
      },
      include: {
        fund: {
          select: {
            id: true,
            name: true,
            moduleType: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      stuckJobsCount: stuckJobs.length,
      stuckJobs: stuckJobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        fundId: job.fundId,
        fundName: job.fund?.name,
        moduleType: job.fund?.moduleType,
        processedDocuments: job.processedDocuments,
        totalDocuments: job.totalDocuments,
        createdAt: job.createdAt,
        startedAt: job.startedAt
      }))
    });

  } catch (error) {
    console.error('Error checking stuck jobs:', error);
    return NextResponse.json({
      error: 'Failed to check stuck jobs'
    }, { status: 500 });
  }
}