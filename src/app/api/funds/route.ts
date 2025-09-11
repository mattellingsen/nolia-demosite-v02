import { NextRequest, NextResponse } from 'next/server';
import { prisma, saveFundWithDocuments, getAllFunds, fileToBuffer } from '@/lib/database-s3';
import { analyzeApplicationForm, analyzeSelectionCriteria } from '@/utils/server-document-analyzer';
import { saveFundWithRAG } from '@/lib/rag-database';

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

    // Process application form (single file)
    const applicationFormFile = formData.get('applicationForm') as File | null;
    let applicationFormData;
    
    if (applicationFormFile) {
      const buffer = await fileToBuffer(applicationFormFile);
      const analysis = await analyzeApplicationForm(applicationFormFile);
      
      applicationFormData = {
        file: buffer,
        filename: applicationFormFile.name,
        mimeType: applicationFormFile.type,
        analysis
      };
    }

    // Process selection criteria (multiple files)
    const selectionCriteriaFiles: File[] = [];
    let index = 0;
    while (formData.get(`selectionCriteria[${index}]`)) {
      const file = formData.get(`selectionCriteria[${index}]`) as File;
      selectionCriteriaFiles.push(file);
      index++;
    }

    let selectionCriteriaData;
    let selectionCriteriaAnalysis;
    
    if (selectionCriteriaFiles.length > 0) {
      selectionCriteriaData = await Promise.all(
        selectionCriteriaFiles.map(async (file) => ({
          file: await fileToBuffer(file),
          filename: file.name,
          mimeType: file.type
        }))
      );
      
      selectionCriteriaAnalysis = await analyzeSelectionCriteria(selectionCriteriaFiles);
    }

    // Process good examples (multiple files)
    const goodExamplesFiles: File[] = [];
    index = 0;
    while (formData.get(`goodExamples[${index}]`)) {
      const file = formData.get(`goodExamples[${index}]`) as File;
      goodExamplesFiles.push(file);
      index++;
    }

    let goodExamplesData;
    let goodExamplesAnalysis;
    
    if (goodExamplesFiles.length > 0) {
      goodExamplesData = await Promise.all(
        goodExamplesFiles.map(async (file) => ({
          file: await fileToBuffer(file),
          filename: file.name,
          mimeType: file.type
        }))
      );
      
      // For now, use the same analysis structure as selection criteria
      // This can be enhanced later for specific good examples analysis
      goodExamplesAnalysis = await analyzeSelectionCriteria(goodExamplesFiles);
    }

    // Save fund with all documents and RAG integration
    const fund = await saveFundWithRAG({
      name,
      description,
      applicationForm: applicationFormData,
      selectionCriteria: selectionCriteriaData,
      selectionCriteriaAnalysis,
      goodExamples: goodExamplesData,
      goodExamplesAnalysis
    });

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
      }
    });

  } catch (error) {
    console.error('Error creating fund:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create fund',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const funds = await getAllFunds();
    
    return NextResponse.json({
      success: true,
      funds: funds.map(fund => ({
        id: fund.id,
        name: fund.name,
        description: fund.description,
        status: fund.status,
        createdAt: fund.createdAt,
        updatedAt: fund.updatedAt,
        documentsCount: fund._count.documents
      }))
    });

  } catch (error) {
    console.error('Error fetching funds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funds' },
      { status: 500 }
    );
  }
}