import { NextRequest, NextResponse } from 'next/server';
import { prisma, saveFundWithDocuments, fileToBuffer } from '@/lib/database-s3';
import { analyzeApplicationForm, analyzeSelectionCriteria } from '@/utils/server-document-analyzer';
import { saveFundWithRAG } from '@/lib/rag-database';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const description = formData.get('description') as string || undefined;

    if (!name) {
      return NextResponse.json(
        { error: 'Tender name is required' },
        { status: 400 }
      );
    }

    // Process application form (single file)
    const applicationFormFile = formData.get('applicationForm') as File | null;
    let applicationFormData;

    if (applicationFormFile) {
      const buffer = await fileToBuffer(applicationFormFile);
      // Skip heavy analysis during initial request - let background job handle it
      const analysis = {
        sections: [],
        wordCount: 0,
        complexity: 'Processing...',
        fieldTypes: [],
        textContent: '',
        questionsFound: 0,
        extractedSections: [],
        status: 'pending_analysis'
      };

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

      // Skip heavy analysis during initial request - let background job handle it
      selectionCriteriaAnalysis = {
        criteria: [],
        totalCriteria: 0,
        complexity: 'Processing...',
        status: 'pending_analysis'
      };
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

      // Skip heavy analysis during initial request - let background job handle it
      goodExamplesAnalysis = {
        criteria: [],
        totalCriteria: 0,
        complexity: 'Processing...',
        status: 'pending_analysis'
      };
    }

    // Save tender with all documents and RAG integration (with PROCUREMENT moduleType)
    const tender = await saveFundWithRAG({
      name,
      description,
      moduleType: 'PROCUREMENT', // KEY: Set moduleType to PROCUREMENT
      applicationForm: applicationFormData,
      selectionCriteria: selectionCriteriaData,
      selectionCriteriaAnalysis,
      goodExamples: goodExamplesData,
      goodExamplesAnalysis
    });

    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        name: tender.name,
        description: tender.description,
        status: tender.status,
        createdAt: tender.createdAt,
        applicationFormAnalysis: tender.applicationFormAnalysis,
        selectionCriteriaAnalysis: tender.selectionCriteriaAnalysis,
        goodExamplesAnalysis: tender.goodExamplesAnalysis
      }
    });

  } catch (error) {
    console.error('Error creating tender:', error);
    return NextResponse.json(
      {
        error: 'Failed to create tender',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Fetch only procurement module tenders
    const tenders = await prisma.fund.findMany({
      where: {
        moduleType: 'PROCUREMENT' // KEY: Filter by moduleType
      },
      include: {
        _count: {
          select: {
            documents: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      tenders: tenders.map(tender => ({
        id: tender.id,
        name: tender.name,
        description: tender.description,
        status: tender.status,
        createdAt: tender.createdAt,
        updatedAt: tender.updatedAt,
        documentsCount: tender._count.documents
      }))
    });

  } catch (error) {
    console.error('Error fetching tenders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenders' },
      { status: 500 }
    );
  }
}