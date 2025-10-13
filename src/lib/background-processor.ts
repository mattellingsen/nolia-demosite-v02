import { prisma } from './database-s3';
import { JobStatus, JobType } from '@prisma/client';

/**
 * Background processor that automatically handles stuck jobs
 * Simulates Lambda function behavior in development environment
 */
class BackgroundProcessor {
  private interval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Get the base URL for API calls
   * Auto-detects the current branch from AWS Amplify environment variables
   */
  private getBaseUrl(): string {
    if (process.env.NODE_ENV === 'production') {
      // AWS Amplify automatically provides AWS_BRANCH environment variable
      const branch = process.env.AWS_BRANCH || 'main';
      const appId = 'd2l8hlr3sei3te';

      // Construct the correct URL based on the deployed branch
      const branchUrl = `https://${branch}.${appId}.amplifyapp.com`;

      console.log(`🔗 Auto-detected branch: ${branch}, using URL: ${branchUrl}`);
      return branchUrl;
    }
    return 'http://localhost:3000';
  }

  /**
   * Start automatic background processing
   */
  start(intervalMs: number = 30000) { // Check every 30 seconds
    if (this.interval) {
      console.log('Background processor already running');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 BACKGROUND PROCESSOR: Starting polling cycle');
    console.log(`🤖 Interval: ${intervalMs}ms (${intervalMs/1000}s)`);
    console.log(`🤖 Environment: ${process.env.NODE_ENV}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    this.interval = setInterval(() => {
      this.processStuckJobs().catch(console.error);
    }, intervalMs);

    // Process immediately on start
    this.processStuckJobs().catch(console.error);
  }

  /**
   * Stop background processing
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🤖 Background processor stopped');
    }
  }

  /**
   * Process stuck jobs that haven't made progress
   */
  private async processStuckJobs() {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.isProcessing = true;

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 POLLING CYCLE: Checking for jobs to process');
      console.log(`🔍 Time: ${new Date().toISOString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Find PENDING jobs (newly created, never started)
      const pendingJobs = await prisma.backgroundJob.findMany({
        where: {
          status: JobStatus.PENDING
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

      // Find jobs that are stuck (PROCESSING status but no progress for > 5 minutes)
      // Increased from 2 to 5 minutes to account for large PDF Textract processing time
      const stuckJobs = await prisma.backgroundJob.findMany({
        where: {
          status: JobStatus.PROCESSING,
          startedAt: {
            lt: new Date(Date.now() - 5 * 60 * 1000) // Started > 5 minutes ago with no completion
          },
          completedAt: null // Still not completed
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

      // NOTE: Textract polling is now handled by EventBridge Scheduler + Lambda
      // (See /api/jobs/textract-poll endpoint)

      // Combine pending and stuck jobs
      const jobsToProcess = [...pendingJobs, ...stuckJobs];

      // Find recently failed jobs that might be retryable (failed < 10 minutes ago)
      // Include ALL module types: FUNDING, PROCUREMENT, PROCUREMENT_ADMIN
      const retryableFailedJobs = await prisma.backgroundJob.findMany({
        where: {
          status: JobStatus.FAILED,
          completedAt: {
            gte: new Date(Date.now() - 10 * 60 * 1000), // Failed within last 10 minutes
            lt: new Date(Date.now() - 2 * 60 * 1000)    // But not too recently (> 2 minutes ago)
          },
          errorMessage: {
            contains: 'connection pool'  // Only retry connection pool errors
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

      console.log(`✅ Found ${pendingJobs.length} pending job(s) to process`);
      console.log(`✅ Found ${stuckJobs.length} stuck job(s) to process`);
      console.log(`✅ Found ${retryableFailedJobs.length} retryable failed job(s)`);

      if (jobsToProcess.length > 0) {
        console.log(`🔧 Processing ${jobsToProcess.length} job(s) (${pendingJobs.length} pending + ${stuckJobs.length} stuck)...`);

        for (const job of jobsToProcess) {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`🎯 JOB PICKUP: Found job ${job.id} to process`);
          console.log(`🎯 Fund: ${job.fund.name} (${job.fund.moduleType})`);
          console.log(`🎯 Job Status: ${job.status}`);
          console.log(`🎯 Progress: ${job.processedDocuments}/${job.totalDocuments}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          try {
            // Trigger job processing via API
            const targetUrl = `${this.getBaseUrl()}/api/jobs/process`;
            const callerContext = {
              detectedBranch: process.env.AWS_BRANCH || 'undefined',
              constructedUrl: targetUrl,
              nodeEnv: process.env.NODE_ENV,
              timestamp: new Date().toISOString(),
            };

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🤖 BACKGROUND PROCESSOR: Triggering job ${job.id}`);
            console.log(`🤖 Fund: ${job.fund.name} (${job.fund.moduleType})`);
            console.log(`🤖 Detected Branch: ${callerContext.detectedBranch}`);
            console.log(`🤖 Calling: ${targetUrl}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            const response = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jobId: job.id,
                autoTrigger: true,
                callerContext // Pass branch context for verification
              }),
            });

            if (response.ok) {
              const result = await response.json();
              console.log(`✅ Successfully processed job ${job.id}: ${result.message}`);
            } else {
              const errorText = await response.text();
              // Don't log full HTML error pages
              const errorMsg = errorText.startsWith('<!DOCTYPE') ? 'HTML error page returned' : errorText;
              console.error(`❌ Failed to process job ${job.id}: ${response.status} ${errorMsg}`);
            }
          } catch (error) {
            console.error(`❌ Error processing job ${job.id}:`, error.message);
          }
        }
      }

      // Handle retryable failed jobs (connection pool errors)
      if (retryableFailedJobs.length > 0) {
        console.log(`🔄 Found ${retryableFailedJobs.length} retryable failed job(s) with connection pool errors...`);

        for (const job of retryableFailedJobs) {
          console.log(`🔄 Retrying failed job: ${job.id} for fund "${job.fund.name}"`);

          try {
            // Use SQS service retry mechanism to reset job to PENDING
            const response = await fetch(`${this.getBaseUrl()}/api/jobs/process`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jobId: job.id,
                retry: true
              }),
            });

            if (response.ok) {
              console.log(`✅ Successfully reset failed job ${job.id} for retry`);
            } else {
              const errorText = await response.text();
              const errorMsg = errorText.startsWith('<!DOCTYPE') ? 'HTML error page returned' : errorText;
              console.error(`❌ Failed to retry job ${job.id}: ${response.status} ${errorMsg}`);
            }
          } catch (error) {
            console.error(`❌ Error retrying job ${job.id}:`, error.message);
          }
        }
      }

      // Also check for PENDING jobs (> 30 seconds old)
      // Include ALL module types: FUNDING, PROCUREMENT, PROCUREMENT_ADMIN
      const stalePendingJobs = await prisma.backgroundJob.findMany({
        where: {
          status: JobStatus.PENDING,
          createdAt: {
            lt: new Date(Date.now() - 30 * 1000) // Created > 30 seconds ago
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

      if (stalePendingJobs.length > 0) {
        console.log(`🔧 Found ${stalePendingJobs.length} stale pending job(s), triggering processing...`);

        for (const job of stalePendingJobs) {
          try {
            console.log(`🔧 Processing stale ${job.type} job for ${job.fund?.moduleType} module: ${job.fund?.name}`);

            if (job.type === 'RAG_PROCESSING') {
              // Trigger brain assembly directly for RAG jobs - use module-specific endpoints
              let assemblyUrl;
              if (job.fund?.moduleType === 'PROCUREMENT_ADMIN') {
                // FIXED: procurement-brain endpoint expects baseId parameter, not fundId
                assemblyUrl = `${this.getBaseUrl()}/api/procurement-brain/${job.fund.id}/assemble`;
              } else if (job.fund?.moduleType === 'WORLDBANK') {
                // WORLDBANK projects use worldbank-brain endpoint
                assemblyUrl = `${this.getBaseUrl()}/api/worldbank-brain/${job.fund.id}/assemble`;
              } else {
                assemblyUrl = `${this.getBaseUrl()}/api/brain/${job.fundId}/assemble`;
              }

              const response = await fetch(assemblyUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                console.log(`✅ Successfully triggered ${job.fund?.moduleType} brain assembly for job ${job.id}`);
              } else {
                const errorData = await response.json();
                console.error(`❌ Failed to trigger ${job.fund?.moduleType} brain assembly for job ${job.id}:`, errorData.error);
              }
            } else {
              // Trigger document processing for other jobs
              const response = await fetch(`${this.getBaseUrl()}/api/jobs/process`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  jobId: job.id,
                  autoTrigger: true
                }),
              });

              if (response.ok) {
                console.log(`✅ Successfully triggered stale ${job.fund?.moduleType} job ${job.id}`);
              } else {
                const errorData = await response.json();
                console.error(`❌ Failed to trigger ${job.fund?.moduleType} job ${job.id}:`, errorData.error);
              }
            }
          } catch (error) {
            console.error(`❌ Error triggering stale ${job.fund?.moduleType} job ${job.id}:`, error);
          }
        }
      }

    } catch (error) {
      console.error('❌ Background processor error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get processor status
   */
  getStatus() {
    return {
      running: this.interval !== null,
      processing: this.isProcessing
    };
  }
}

export const backgroundProcessor = new BackgroundProcessor();

// Auto-start in both development and production
// In serverless production, this enables background job processing
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
  // Add a small delay to ensure server is ready
  setTimeout(() => {
    backgroundProcessor.start();
    console.log(`🤖 Background processor auto-started in ${process.env.NODE_ENV} mode`);
  }, 5000);
}