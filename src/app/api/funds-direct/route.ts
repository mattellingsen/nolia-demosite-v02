import { NextRequest, NextResponse } from 'next/server';
import { prisma, uploadFileToS3 } from '@/lib/database-s3';
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

    console.log(`Creating fund with direct S3 uploads: ${name}`);
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

    // Process files directly to S3 and database
    const documentPromises: Promise<any>[] = [];
    let totalFiles = 0;

    // Application form
    const applicationFormFile = formData.get('applicationForm') as File | null;
    if (applicationFormFile) {
      totalFiles++;
      const promise = processFileDirectly(applicationFormFile, fund.id, 'APPLICATION_FORM');
      documentPromises.push(promise);
    }

    // Selection criteria files
    let index = 0;
    while (formData.get(`selectionCriteria[${index}]`)) {
      const file = formData.get(`selectionCriteria[${index}]`) as File;
      totalFiles++;
      const promise = processFileDirectly(file, fund.id, 'SELECTION_CRITERIA');
      documentPromises.push(promise);
      index++;
    }

    // Good examples files
    index = 0;
    while (formData.get(`goodExamples[${index}]`)) {
      const file = formData.get(`goodExamples[${index}]`) as File;
      totalFiles++;
      const promise = processFileDirectly(file, fund.id, 'GOOD_EXAMPLES');
      documentPromises.push(promise);
      index++;
    }

    // Process all files in parallel
    console.log(`Processing ${totalFiles} files directly to S3...`);
    const uploadResults = await Promise.allSettled(documentPromises);
    
    const successful = uploadResults.filter(r => r.status === 'fulfilled').length;
    const failed = uploadResults.filter(r => r.status === 'rejected').length;
    
    if (failed > 0) {
      console.warn(`${failed} files failed to upload, ${successful} succeeded`);
    }

    // Create background job for document analysis only
    const job = await BackgroundJobService.createJob(
      fund.id, 
      'RAG_PROCESSING',
      {
        totalDocuments: successful,
        skipFileUpload: true, // Files already uploaded
        createdAt: new Date().toISOString()
      }
    );

    const duration = Date.now() - startTime;
    console.log(`Fund created with direct uploads in ${duration}ms`);

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
        filesUploaded: successful,
        filesFailed: failed,
        analysisInProgress: true
      },
      performance: {
        duration: `${duration}ms`,
        message: 'Fund and files uploaded directly, analysis in progress'
      }
    });

  } catch (error) {
    console.error('Error creating fund with direct uploads:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create fund',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function processFileDirectly(file: File, fundId: string, documentType: string): Promise<void> {
  try {
    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload directly to S3
    const s3Key = await uploadFileToS3(
      buffer, 
      file.name, 
      file.type, 
      documentType.toLowerCase().replace('_', '-')
    );
    
    // Create document record
    await prisma.fundDocument.create({
      data: {
        fundId,
        documentType: documentType as any,
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        s3Key
      }
    });
    
    console.log(`Successfully uploaded ${file.name} to S3`);
  } catch (error) {
    console.error(`Failed to process file ${file.name}:`, error);
    throw error;
  }
}