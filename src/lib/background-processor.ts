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
   * Start automatic background processing
   */
  start(intervalMs: number = 30000) { // Check every 30 seconds
    if (this.interval) {
      console.log('Background processor already running');
      return;
    }

    console.log('🤖 Background processor starting...');
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
      // Find jobs that are stuck (PROCESSING status but no progress for > 2 minutes)
      // Include ALL module types: FUNDING, PROCUREMENT, PROCUREMENT_ADMIN
      const stuckJobs = await prisma.backgroundJob.findMany({
        where: {
          status: JobStatus.PROCESSING,
          processedDocuments: 0,
          startedAt: {
            lt: new Date(Date.now() - 2 * 60 * 1000) // Started > 2 minutes ago
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

      if (stuckJobs.length > 0) {
        console.log(`🔧 Found ${stuckJobs.length} stuck job(s), triggering processing...`);

        for (const job of stuckJobs) {
          console.log(`📋 Processing stuck job: ${job.id} for fund "${job.fund.name}"`);

          try {
            // Trigger job processing via API
            const response = await fetch('http://localhost:3000/api/jobs/process', {
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
            const response = await fetch(`http://localhost:3000/api/jobs/process`, {
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

      // Also check for very old PENDING jobs (> 5 minutes)
      // Include ALL module types: FUNDING, PROCUREMENT, PROCUREMENT_ADMIN
      const stalePendingJobs = await prisma.backgroundJob.findMany({
        where: {
          status: JobStatus.PENDING,
          createdAt: {
            lt: new Date(Date.now() - 5 * 60 * 1000) // Created > 5 minutes ago
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
              // Trigger brain assembly directly for RAG jobs
              const response = await fetch(`http://localhost:3000/api/brain/${job.fundId}/assemble`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                console.log(`✅ Successfully triggered brain assembly for ${job.fund?.moduleType} job ${job.id}`);
              } else {
                const errorData = await response.json();
                console.error(`❌ Failed to trigger brain assembly for ${job.fund?.moduleType} job ${job.id}:`, errorData.error);
              }
            } else {
              // Trigger document processing for other jobs
              const response = await fetch('http://localhost:3000/api/jobs/process', {
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

// Auto-start in development
if (process.env.NODE_ENV === 'development') {
  // Add a small delay to ensure server is ready
  setTimeout(() => {
    backgroundProcessor.start();
  }, 5000);
}