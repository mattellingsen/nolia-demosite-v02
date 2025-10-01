import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { JobStatus } from '@prisma/client';
import { forceIAMRole } from '@/lib/force-iam-role';

// CRITICAL: Force IAM role usage in production (prevents SSO errors)
forceIAMRole();

/**
 * Serverless-compatible endpoint to process stale PENDING jobs
 * This replaces the background processor's setInterval() which doesn't work in serverless
 *
 * Call this endpoint:
 * 1. After document analysis completes
 * 2. Via external cron service (e.g., AWS EventBridge, Vercel Cron)
 * 3. Manually when jobs are stuck
 */
export async function POST(request: NextRequest) {
  try {
    // Parse optional parameters
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Ignore parse errors - body is optional
    }

    const { immediate = false, fundId = null } = body;

    console.log('🔍 Checking for PENDING jobs...', { immediate, fundId });

    // Build query conditions
    const whereConditions: any = {
      type: 'RAG_PROCESSING',
      status: JobStatus.PENDING,
    };

    // If immediate trigger, don't wait for age threshold
    if (!immediate) {
      whereConditions.createdAt = {
        lt: new Date(Date.now() - 30 * 1000) // Created > 30 seconds ago
      };
    }

    // If specific fundId provided, only process that fund's jobs
    if (fundId) {
      whereConditions.fundId = fundId;
    }

    // Find PENDING RAG_PROCESSING jobs
    const stalePendingJobs = await prisma.backgroundJob.findMany({
      where: whereConditions,
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

    if (stalePendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stale pending jobs found',
        checked: new Date().toISOString()
      });
    }

    console.log(`🔧 Found ${stalePendingJobs.length} stale PENDING job(s), triggering processing...`);

    const results = [];

    for (const job of stalePendingJobs) {
      try {
        console.log(`🧠 Triggering brain assembly for ${job.fund?.moduleType} module: ${job.fund?.name}`);

        // Get the base URL (use environment variable in production)
        const baseUrl = process.env.NODE_ENV === 'production'
          ? (process.env.NEXTAUTH_URL || 'https://main.d2l8hlr3sei3te.amplifyapp.com')
          : 'http://localhost:3000';

        // Build the correct assembly URL based on module type
        let assemblyUrl;
        if (job.fund?.moduleType === 'PROCUREMENT_ADMIN') {
          // FIXED: Use baseId parameter name instead of fundId
          assemblyUrl = `${baseUrl}/api/procurement-brain/${job.fund.id}/assemble`;
        } else {
          assemblyUrl = `${baseUrl}/api/brain/${job.fundId}/assemble`;
        }

        console.log(`📡 Calling assembly endpoint: ${assemblyUrl}`);

        // Trigger brain assembly
        const response = await fetch(assemblyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Successfully triggered ${job.fund?.moduleType} brain assembly for job ${job.id}`);
          results.push({
            jobId: job.id,
            fundId: job.fundId,
            moduleType: job.fund?.moduleType,
            status: 'triggered',
            result
          });
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to trigger brain assembly for job ${job.id}: ${response.status}`);
          console.error('Error response:', errorText);
          results.push({
            jobId: job.id,
            fundId: job.fundId,
            moduleType: job.fund?.moduleType,
            status: 'failed',
            error: errorText.substring(0, 200) // Truncate long errors
          });
        }
      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        results.push({
          jobId: job.id,
          fundId: job.fundId,
          moduleType: job.fund?.moduleType,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${stalePendingJobs.length} stale PENDING job(s)`,
      results
    });

  } catch (error) {
    console.error('❌ Error checking pending jobs:', error);
    return NextResponse.json({
      error: 'Failed to check pending jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check for stale jobs without processing them
 */
export async function GET() {
  try {
    const stalePendingJobs = await prisma.backgroundJob.findMany({
      where: {
        type: 'RAG_PROCESSING',
        status: JobStatus.PENDING,
        createdAt: {
          lt: new Date(Date.now() - 30 * 1000)
        }
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
      count: stalePendingJobs.length,
      jobs: stalePendingJobs.map(job => ({
        id: job.id,
        fundId: job.fundId,
        fundName: job.fund?.name,
        moduleType: job.fund?.moduleType,
        createdAt: job.createdAt,
        ageInSeconds: Math.floor((Date.now() - job.createdAt.getTime()) / 1000)
      }))
    });
  } catch (error) {
    console.error('Error checking stale jobs:', error);
    return NextResponse.json({
      error: 'Failed to check stale jobs'
    }, { status: 500 });
  }
}