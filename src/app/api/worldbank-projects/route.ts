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
        { error: 'Project name is required' },
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

    // Save project with all documents and RAG integration (with WORLDBANK moduleType)
    const project = await saveFundWithRAG({
      name,
      description,
      moduleType: 'WORLDBANK', // KEY: Set moduleType to WORLDBANK
      applicationForm: applicationFormData,
      selectionCriteria: selectionCriteriaData,
      selectionCriteriaAnalysis,
      goodExamples: goodExamplesData,
      goodExamplesAnalysis
    });

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        applicationFormAnalysis: project.applicationFormAnalysis,
        selectionCriteriaAnalysis: project.selectionCriteriaAnalysis,
        goodExamplesAnalysis: project.goodExamplesAnalysis
      }
    });

  } catch (error) {
    console.error('Error creating World Bank project:', error);
    return NextResponse.json(
      {
        error: 'Failed to create World Bank project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Fetch only worldbank module projects
    const projects = await prisma.funds.findMany({
      where: {
        moduleType: 'WORLDBANK' // KEY: Filter by moduleType
      },
      include: {
        _count: {
          select: {
            fund_documents: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        documentsCount: project._count.fund_documents
      }))
    });

  } catch (error) {
    console.error('Error fetching World Bank projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch World Bank projects' },
      { status: 500 }
    );
  }
}
