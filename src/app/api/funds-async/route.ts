import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { BackgroundJobService } from '@/lib/background-job-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || undefined;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Fund name is required' },
        { status: 400 }
      );
    }

    console.log(`Creating fund asynchronously: ${name}`);
    const startTime = Date.now();

    // Create fund with minimal data first
    const fund = await prisma.fund.create({
      data: {
        name,
        description,
        status: 'DRAFT',
        applicationFormAnalysis: {
          status: 'pending_processing',
          sections: [],
          wordCount: 0,
          complexity: 'Processing...',
          fieldTypes: [],
          textContent: '',
          questionsFound: 0,
          extractedSections: []
        },
        selectionCriteriaAnalysis: {
          status: 'pending_processing',
          criteria: [],
          totalCriteria: 0,
          complexity: 'Processing...'
        },
        goodExamplesAnalysis: {
          status: 'pending_processing',
          criteria: [],
          totalCriteria: 0,
          complexity: 'Processing...'
        }
      }
    });

    // Collect files for background processing
    const filesToProcess: Array<{
      file: File;
      type: 'APPLICATION_FORM' | 'SELECTION_CRITERIA' | 'GOOD_EXAMPLES';
    }> = [];

    // Application form
    const applicationFormFile = formData.get('applicationForm') as File | null;
    if (applicationFormFile) {
      filesToProcess.push({ file: applicationFormFile, type: 'APPLICATION_FORM' });
    }

    // Selection criteria files
    let index = 0;
    while (formData.get(`selectionCriteria[${index}]`)) {
      const file = formData.get(`selectionCriteria[${index}]`) as File;
      filesToProcess.push({ file, type: 'SELECTION_CRITERIA' });
      index++;
    }

    // Good examples files
    index = 0;
    while (formData.get(`goodExamples[${index}]`)) {
      const file = formData.get(`goodExamples[${index}]`) as File;
      filesToProcess.push({ file, type: 'GOOD_EXAMPLES' });
      index++;
    }

    // Store files temporarily for background processing
    const tempFileData = await Promise.all(
      filesToProcess.map(async ({ file, type }) => {
        const buffer = await file.arrayBuffer();
        return {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          type,
          data: Buffer.from(buffer).toString('base64') // Store as base64 for JSON
        };
      })
    );

    // Create background job with file data
    const job = await BackgroundJobService.createJob(
      fund.id, 
      'RAG_PROCESSING',
      {
        totalDocuments: filesToProcess.length,
        files: tempFileData,
        createdAt: new Date().toISOString()
      }
    );

    const duration = Date.now() - startTime;
    console.log(`Fund created asynchronously in ${duration}ms, background job started`);

    return NextResponse.json({
      success: true,
      fund: {
        id: fund.id,
        name: fund.name,
        description: fund.description,
        status: fund.status,
        createdAt: fund.createdAt,
        applicationFormAnalysis: fund.applicationFormAnalysis,
        selectionCriteriaAnalysis: fund.selectionCriteriaAnalysis,
        goodExamplesAnalysis: fund.goodExamplesAnalysis
      },
      processing: {
        jobId: job.id,
        filesQueued: filesToProcess.length,
        estimatedProcessingTime: `${Math.max(30, filesToProcess.length * 10)} seconds`
      },
      performance: {
        duration: `${duration}ms`,
        message: 'Fund created immediately, files processing in background'
      }
    });

  } catch (error) {
    console.error('Error creating fund async:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create fund',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}