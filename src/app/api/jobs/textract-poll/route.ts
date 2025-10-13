import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { getTextractJobStatus, getTextractJobResults } from '@/lib/aws-textract';

const API_KEY = 'nolia-textract-poller-secret-key-2025-staging-v1';

/**
 * EventBridge Scheduled Poller for Textract Jobs
 *
 * Triggered every 1 minute by EventBridge Scheduler
 * Checks all jobs with pending Textract jobs and updates when complete
 */
export async function POST(request: NextRequest) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 TEXTRACT POLLER: Triggered at', new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Verify API key
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== API_KEY) {
    console.error('❌ TEXTRACT POLLER: Invalid API key');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all PENDING/PROCESSING jobs (we'll filter for textractJobs in JavaScript)
    const allJobs = await prisma.backgroundJob.findMany({
      where: {
        status: {
          in: ['PENDING', 'PROCESSING']
        }
      }
    });

    // Filter for jobs that have textractJobs in metadata
    const jobsWithTextract = allJobs.filter(job => {
      const metadata = job.metadata as any;
      return metadata?.textractJobs && Object.keys(metadata.textractJobs).length > 0;
    });

    console.log(`📊 Found ${jobsWithTextract.length} job(s) with Textract jobs (out of ${allJobs.length} total)`);

    if (jobsWithTextract.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No jobs with pending Textract jobs found',
        jobsChecked: 0
      });
    }

    let totalChecked = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalStillPending = 0;

    // Check each job's Textract jobs
    for (const job of jobsWithTextract) {
      const metadata = job.metadata as any;
      const textractJobs = metadata?.textractJobs || {};

      if (Object.keys(textractJobs).length === 0) {
        continue;
      }

      console.log(`\n🔍 Checking job ${job.id} (${Object.keys(textractJobs).length} Textract job(s))`);

      let hasUpdates = false;
      const updatedTextractJobs = { ...textractJobs };

      for (const [docId, textractJob] of Object.entries(textractJobs) as [string, any][]) {
        if (textractJob.status === 'IN_PROGRESS') {
          totalChecked++;

          try {
            console.log(`  📄 Checking Textract job ${textractJob.jobId} for ${textractJob.filename}...`);
            const status = await getTextractJobStatus(textractJob.jobId);

            if (status.status === 'SUCCEEDED') {
              console.log(`  ✅ Textract job ${textractJob.jobId} completed! Retrieving results...`);
              const extractedText = await getTextractJobResults(textractJob.jobId);

              updatedTextractJobs[docId] = {
                ...textractJob,
                status: 'SUCCEEDED',
                completedAt: new Date().toISOString(),
                extractedText: extractedText,
                textLength: extractedText.length
              };

              hasUpdates = true;
              totalCompleted++;
              console.log(`  ✅ Extracted ${extractedText.length} characters from ${textractJob.filename}`);
            } else if (status.status === 'FAILED') {
              console.error(`  ❌ Textract job ${textractJob.jobId} failed: ${status.statusMessage}`);
              updatedTextractJobs[docId] = {
                ...textractJob,
                status: 'FAILED',
                completedAt: new Date().toISOString(),
                errorMessage: status.statusMessage
              };
              hasUpdates = true;
              totalFailed++;
            } else {
              console.log(`  ⏳ Textract job ${textractJob.jobId} still in progress (${status.status})`);
              totalStillPending++;
            }
          } catch (error) {
            console.error(`  ❌ Error checking Textract job ${textractJob.jobId}:`, error);
            totalStillPending++; // Count as still pending if we hit an error
          }
        }
      }

      // Update job metadata if any Textract jobs completed
      if (hasUpdates) {
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            metadata: {
              ...metadata,
              textractJobs: updatedTextractJobs
            }
          }
        });
        console.log(`  💾 Updated Textract job statuses in metadata for job ${job.id}`);

        // If all Textract jobs are done (no more IN_PROGRESS), trigger job processing to continue
        const stillPending = Object.values(updatedTextractJobs).some((tj: any) => tj.status === 'IN_PROGRESS');

        if (!stillPending) {
          console.log(`  🚀 All Textract jobs complete for job ${job.id}. Triggering job processing...`);

          // Trigger the job processor to continue processing
          try {
            const baseUrl = process.env.NODE_ENV === 'production'
              ? `https://${process.env.AWS_BRANCH || 'staging'}.d2l8hlr3sei3te.amplifyapp.com`
              : 'http://localhost:3000';

            const response = await fetch(`${baseUrl}/api/jobs/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobId: job.id,
                autoTrigger: true,
                source: 'textract-poller-resume'
              })
            });

            if (response.ok) {
              console.log(`  ✅ Successfully triggered job processing for job ${job.id}`);
            } else {
              console.error(`  ⚠️ Failed to trigger job processing for job ${job.id}: ${response.status}`);
            }
          } catch (error) {
            console.error(`  ⚠️ Error triggering job processing for job ${job.id}:`, error);
          }
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEXTRACT POLLER SUMMARY:');
    console.log(`   Total Textract jobs checked: ${totalChecked}`);
    console.log(`   Completed: ${totalCompleted}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(`   Still pending: ${totalStillPending}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      jobsChecked: jobsWithTextract.length,
      textractJobsChecked: totalChecked,
      completed: totalCompleted,
      failed: totalFailed,
      stillPending: totalStillPending
    });

  } catch (error) {
    console.error('❌ TEXTRACT POLLER ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
