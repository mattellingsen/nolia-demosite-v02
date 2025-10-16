import { NextRequest, NextResponse } from 'next/server';
import { prisma, uploadFileToS3 } from '@/lib/database-s3';

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

    console.log(`Creating fund with simple approach: ${name}`);
    const startTime = Date.now();

    // Create fund first - minimal data only
    const fund = await prisma.funds.create({
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

    const duration = Date.now() - startTime;
    console.log(`Fund created in ${duration}ms, skipping file processing for now`);

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
        filesUploaded: 0,
        filesFailed: 0,
        analysisInProgress: false,
        message: 'Fund created without file processing - testing basic functionality'
      },
      performance: {
        duration: `${duration}ms`,
        message: 'Basic fund creation successful'
      }
    });

  } catch (error) {
    console.error('Error creating fund with simple approach:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create fund',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}