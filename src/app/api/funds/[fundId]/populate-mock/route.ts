import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;
    
    // Check if fund exists
    const existingFund = await prisma.fund.findUnique({
      where: { id: fundId }
    });
    
    if (!existingFund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      );
    }

    // Mock data that matches the real analysis structures
    const mockApplicationFormAnalysis = {
      questionsDetected: 15,
      estimatedQuestions: 15,
      sections: [
        'Organization Information',
        'Project Description', 
        'Budget & Timeline',
        'Team & Capabilities',
        'Expected Outcomes',
        'Risk Assessment'
      ],
      fieldTypes: [
        'text',
        'textarea', 
        'select',
        'number',
        'date',
        'file-upload'
      ],
      processingTime: 2300
    };

    const mockSelectionCriteriaAnalysis = {
      criteriaFound: 8,
      weightings: [
        { name: 'Innovation & Technical Merit', weight: 35 },
        { name: 'Commercial Potential', weight: 25 },
        { name: 'Team Capabilities', weight: 20 },
        { name: 'Financial Viability', weight: 15 },
        { name: 'Market Impact', weight: 5 }
      ],
      categories: [
        'Technical Innovation',
        'Market Analysis',
        'Team Experience', 
        'Financial Planning',
        'Risk Management',
        'Intellectual Property',
        'Commercialization Strategy',
        'Industry Partnerships'
      ],
      scoringMethod: 'Points',
      detectedCriteria: [
        'Clear demonstration of technical innovation beyond current state-of-the-art',
        'Evidence of strong market demand and commercial viability',
        'Experienced team with relevant technical and commercial expertise',
        'Realistic budget and timeline with appropriate milestones',
        'Comprehensive risk assessment with mitigation strategies',
        'Strong intellectual property strategy and freedom to operate',
        'Clear path to market with identified customers and partners',
        'Potential for significant economic and social impact'
      ]
    };

    const mockGoodExamplesAnalysis = {
      examplesAnalyzed: 4,
      averageScore: 87,
      qualityIndicators: [
        { name: 'Answer Relevance', score: 92, description: 'Responses directly address questions asked' },
        { name: 'Detail Level', score: 88, description: 'Appropriate amount of detail provided' },
        { name: 'Evidence Quality', score: 85, description: 'Strong supporting evidence and examples' },
        { name: 'Writing Clarity', score: 90, description: 'Clear, professional communication style' }
      ],
      writingPatterns: [
        'Average response length: 150-200 words per question',
        'Uses specific examples and quantified metrics',
        'Follows structured format with clear headings',
        'Professional but engaging tone throughout'
      ],
      commonStrengths: [
        'Clear problem identification',
        'Detailed implementation plans',
        'Realistic budget breakdowns',
        'Strong team credentials',
        'Measurable outcomes defined',
        'Risk mitigation strategies',
        'Market validation evidence'
      ]
    };

    // Update the fund with mock analysis data
    const updatedFund = await prisma.fund.update({
      where: { id: fundId },
      data: {
        applicationFormAnalysis: mockApplicationFormAnalysis,
        selectionCriteriaAnalysis: mockSelectionCriteriaAnalysis,
        goodExamplesAnalysis: mockGoodExamplesAnalysis,
        name: 'New to R&D Grant Program',
        description: 'Supporting innovative businesses to undertake their first commercial research and development project.',
        updatedAt: new Date()
      }
    });

    // Create mock documents metadata (without actual S3 files since we can't upload)
    const mockDocuments = [
      {
        fundId: fundId,
        documentType: 'APPLICATION_FORM',
        filename: 'R&D-Application-Form-Template.pdf',
        mimeType: 'application/pdf',
        fileSize: 524288, // 512KB
        s3Key: `funds/${fundId}/application-form/mock-application-form.pdf`
      },
      {
        fundId: fundId,
        documentType: 'SELECTION_CRITERIA',
        filename: 'Assessment-Criteria-Guidelines.pdf',
        mimeType: 'application/pdf', 
        fileSize: 387654, // ~378KB
        s3Key: `funds/${fundId}/criteria/mock-criteria.pdf`
      },
      {
        fundId: fundId,
        documentType: 'SELECTION_CRITERIA',
        filename: 'Scoring-Rubric.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: 156789, // ~153KB  
        s3Key: `funds/${fundId}/criteria/mock-rubric.xlsx`
      },
      {
        fundId: fundId,
        documentType: 'GOOD_EXAMPLES',
        filename: 'Successful-Application-Example-1.pdf',
        mimeType: 'application/pdf',
        fileSize: 892345, // ~871KB
        s3Key: `funds/${fundId}/examples/mock-example-1.pdf`
      },
      {
        fundId: fundId,
        documentType: 'GOOD_EXAMPLES', 
        filename: 'Successful-Application-Example-2.pdf',
        mimeType: 'application/pdf',
        fileSize: 756234, // ~738KB
        s3Key: `funds/${fundId}/examples/mock-example-2.pdf`
      },
      {
        fundId: fundId,
        documentType: 'GOOD_EXAMPLES',
        filename: 'High-Scoring-Application-Example.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 445566, // ~435KB
        s3Key: `funds/${fundId}/examples/mock-example-3.docx`
      }
    ];

    // Insert mock documents
    await prisma.fundDocument.createMany({
      data: mockDocuments
    });

    return NextResponse.json({
      success: true,
      message: 'Test fund populated with mock data successfully',
      fund: {
        id: updatedFund.id,
        name: updatedFund.name,
        description: updatedFund.description,
        status: updatedFund.status,
        documentsCount: mockDocuments.length,
        hasAnalysis: true
      }
    });

  } catch (error) {
    console.error('Error populating mock data:', error);
    return NextResponse.json(
      { error: 'Failed to populate mock data' },
      { status: 500 }
    );
  }
}