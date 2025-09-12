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

    console.log(`Creating fund with sequential uploads: ${name}`);
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

    console.log(`Fund created, now processing files sequentially...`);
    
    // Process files sequentially to avoid overwhelming Lambda
    let totalFiles = 0;
    let successful = 0;
    let failed = 0;

    // Application form (1 file)
    const applicationFormFile = formData.get('applicationForm') as File | null;
    if (applicationFormFile) {
      try {
        totalFiles++;
        await processFileSequentially(applicationFormFile, fund.id, 'APPLICATION_FORM');
        successful++;
        console.log(`Processed application form: ${applicationFormFile.name}`);
      } catch (error) {
        console.error(`Failed to process application form:`, error);
        failed++;
      }
    }

    // Selection criteria files (up to 9 files) - process one at a time
    let index = 0;
    while (formData.get(`selectionCriteria[${index}]`)) {
      const file = formData.get(`selectionCriteria[${index}]`) as File;
      try {
        totalFiles++;
        await processFileSequentially(file, fund.id, 'SELECTION_CRITERIA');
        successful++;
        console.log(`Processed selection criteria ${index}: ${file.name}`);
      } catch (error) {
        console.error(`Failed to process selection criteria ${index}:`, error);
        failed++;
      }
      index++;
    }

    // Good examples files (up to 4 files) - process one at a time
    index = 0;
    while (formData.get(`goodExamples[${index}]`)) {
      const file = formData.get(`goodExamples[${index}]`) as File;
      try {
        totalFiles++;
        await processFileSequentially(file, fund.id, 'GOOD_EXAMPLES');
        successful++;
        console.log(`Processed good example ${index}: ${file.name}`);
      } catch (error) {
        console.error(`Failed to process good example ${index}:`, error);
        failed++;
      }
      index++;
    }

    console.log(`File processing complete: ${successful}/${totalFiles} files uploaded`);

    // Create background job for document analysis only if we have files
    let job = null;
    if (successful > 0) {
      job = await BackgroundJobService.createJob(
        fund.id, 
        'RAG_PROCESSING',
        {
          totalDocuments: successful,
          skipFileUpload: true, // Files already uploaded
          createdAt: new Date().toISOString()
        }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`Fund created with sequential uploads in ${duration}ms`);

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
        jobId: job?.id,
        filesUploaded: successful,
        filesFailed: failed,
        analysisInProgress: successful > 0
      },
      performance: {
        duration: `${duration}ms`,
        message: `Fund created with sequential file processing - ${successful}/${totalFiles} files uploaded`
      }
    });

  } catch (error) {
    console.error('Error creating fund with sequential uploads:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create fund',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function processFileSequentially(file: File, fundId: string, documentType: string): Promise<void> {
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
  
  console.log(`Successfully uploaded ${file.name} to S3 and database`);
}