import { NextRequest, NextResponse } from 'next/server';
import { BackgroundJobService } from '@/lib/background-job-service';

export async function POST(request: NextRequest) {
  try {
    // Simple authentication check (optional)
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY;
    
    if (adminKey && authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Processing background jobs...');
    
    let processedCount = 0;
    let hasMoreJobs = true;
    const maxJobsPerRun = 5; // Prevent overwhelming the system
    
    // Process up to maxJobsPerRun jobs
    while (hasMoreJobs && processedCount < maxJobsPerRun) {
      hasMoreJobs = await BackgroundJobService.processNextJob();
      if (hasMoreJobs) {
        processedCount++;
        console.log(`Processed job ${processedCount}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      processedJobs: processedCount,
      hasMoreJobs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing jobs:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}