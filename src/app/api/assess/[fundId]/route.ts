/**
 * Assessment API Route - Production Version
 *
 * This route uses the new two-stage architecture:
 * 1. AI Assessment: Focused Claude prompts for scoring and evaluation
 * 2. Template Processing: Deterministic mapping without Claude involvement
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { extractTextFromFile } from '@/utils/server-document-analyzer';
import { assessmentEngine, FundBrain } from '@/lib/assessment-engine';
import { templateEngine } from '@/lib/template-engine';

interface RouteParams {
  params: Promise<{
    fundId: string;
  }>;
}

/**
 * Assess an application document against a specific fund's brain
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();

  try {
    const { fundId } = await params;

    if (!fundId) {
      return NextResponse.json({
        error: 'Fund ID is required'
      }, { status: 400 });
    }

    // Parse the form data to get the uploaded file
    const formData = await request.formData();
    const file = formData.get('application') as File;

    if (!file) {
      return NextResponse.json({
        error: 'Application document is required'
      }, { status: 400 });
    }

    console.log(`🔍 Starting assessment: ${file.name} for fund ${fundId}`);

    // Get the fund with its brain data
    const fund = await getFundWithBrain(fundId);
    if (!fund.success) {
      return NextResponse.json({
        error: fund.error
      }, { status: fund.status });
    }

    // Extract document content
    console.log(`📄 Extracting content from: ${file.name}`);
    const documentContent = await extractDocumentContent(file);

    // Convert fund brain to assessment engine format
    const fundBrain = convertToFundBrain(fund.data);

    // Stage 1: AI Assessment
    console.log(`🧠 Stage 1: AI Assessment with ${fundBrain.criteria.length} criteria`);
    const assessmentResult = await assessmentEngine.assessApplication(
      documentContent,
      file.name,
      fundBrain,
      fundId,
      fund.data.outputTemplatesAnalysis?.placeholders || []
    );

    if (!assessmentResult.success) {
      console.error('❌ Assessment failed:', assessmentResult.error);
      return NextResponse.json({
        error: 'Assessment failed',
        details: assessmentResult.error,
        warnings: assessmentResult.warnings
      }, { status: 500 });
    }

    const assessment = assessmentResult.result!;

    // Stage 2: Template Processing
    let templateResult;
    if (fund.data.outputTemplatesAnalysis) {
      console.log(`🎨 Stage 2: Template Processing`);
      templateResult = await templateEngine.applyTemplate(
        assessment,
        fund.data.outputTemplatesAnalysis
      );

      if (!templateResult.success) {
        console.warn('⚠️ Template processing failed, using standard format');
      }
    } else {
      console.log('📄 No custom template, using standard format');
      templateResult = await templateEngine.applyTemplate(assessment, {
        useRawTemplate: false,
        filename: 'Standard Assessment Template'
      });
    }

    // Prepare response in format expected by UI
    const response = {
      success: true,
      assessment: {
        ...assessment,
        formattedOutput: templateResult,
        templateApplied: templateResult.success,
        templateName: templateResult.metadata.template_used,
        templateError: templateResult.error,
      }
    };

    const duration = Date.now() - startTime;
    console.log(`✅ Assessment completed in ${duration}ms`);
    console.log(`📊 Score: ${assessment.overallScore}/100`);
    console.log(`🤖 AI used for assessment: ${assessment.aiStatus.assessmentUsedAI ? 'Yes' : 'No'}`);
    console.log(`🤖 AI used for fields: ${assessment.aiStatus.fieldExtractionUsedAI ? 'Yes' : 'No'}`);

    if (assessmentResult.warnings.length > 0) {
      console.log(`⚠️ Warnings: ${assessmentResult.warnings.join(', ')}`);
    }

    return NextResponse.json(response);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Assessment API failed after ${duration}ms:`, error);

    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
      });
    }

    return NextResponse.json({
      error: 'Assessment failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.name : 'UnknownError'
    }, { status: 500 });
  }
}

/**
 * Get fund with brain data and validation
 */
async function getFundWithBrain(fundId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}> {
  try {
    // Test basic fund access first
    const basicFund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: { id: true, name: true }
    });

    if (!basicFund) {
      return {
        success: false,
        error: 'Fund not found',
        status: 404
      };
    }

    console.log(`📋 Found fund: ${basicFund.name}`);

    // Get full fund data
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: {
        id: true,
        name: true,
        description: true,
        fundBrain: true,
        brainAssembledAt: true,
        applicationFormAnalysis: true,
        selectionCriteriaAnalysis: true,
        goodExamplesAnalysis: true,
        outputTemplatesAnalysis: true,
      }
    });

    if (!fund) {
      return {
        success: false,
        error: 'Fund not found',
        status: 404
      };
    }

    // Validate fund brain
    if (!fund.fundBrain || !fund.brainAssembledAt) {
      return {
        success: false,
        error: 'Fund brain not assembled. Please complete fund setup first.',
        status: 400
      };
    }

    return {
      success: true,
      data: fund
    };

  } catch (error) {
    console.error('❌ Database query failed:', error);
    return {
      success: false,
      error: 'Database access failed',
      status: 500
    };
  }
}

/**
 * Extract content from uploaded document
 */
async function extractDocumentContent(file: File): Promise<string> {
  try {
    const extractedText = await extractTextFromFile(file);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Document appears to be empty or contains no extractable text');
    }

    console.log(`📄 Extracted ${extractedText.length} characters from ${file.name}`);
    return extractedText;

  } catch (error) {
    console.error('❌ Document extraction failed:', error);
    throw new Error(`Failed to extract content from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert database fund brain to assessment engine format
 */
function convertToFundBrain(fund: any): FundBrain {
  const fundBrain = fund.fundBrain;

  // Extract criteria from brain
  const criteria = [];
  if (fundBrain?.assessmentCriteria?.categories) {
    for (const category of fundBrain.assessmentCriteria.categories) {
      criteria.push({
        name: category.name || 'Assessment Criterion',
        description: category.description || 'Evaluate based on application evidence',
        weight: category.weight || 25,
        keyIndicators: category.keyIndicators || ['Quality', 'Relevance', 'Completeness']
      });
    }
  }

  // If no criteria found, use defaults
  if (criteria.length === 0) {
    criteria.push(
      {
        name: 'Completeness',
        description: 'Application completeness and clarity',
        weight: 25,
        keyIndicators: ['All required information provided', 'Clear documentation', 'Professional presentation']
      },
      {
        name: 'Alignment',
        description: 'Alignment with fund objectives',
        weight: 25,
        keyIndicators: ['Meets fund criteria', 'Addresses fund priorities', 'Appropriate scope']
      },
      {
        name: 'Innovation',
        description: 'Innovation and potential impact',
        weight: 25,
        keyIndicators: ['Novel approach', 'Creative solutions', 'Potential for impact']
      },
      {
        name: 'Feasibility',
        description: 'Project feasibility and capability',
        weight: 25,
        keyIndicators: ['Realistic timeline', 'Adequate resources', 'Team capability']
      }
    );
  }

  return {
    fundName: fund.name,
    criteria,
    successPatterns: {
      averageScore: fundBrain?.successPatterns?.averageScore || 85,
      commonStrengths: fundBrain?.successPatterns?.commonStrengths || [
        'Clear objectives and methodology',
        'Strong team and capability',
        'Realistic implementation plan'
      ],
      keyIndicators: fundBrain?.successPatterns?.keyIndicators || [
        'Innovation potential',
        'Team capability',
        'Market viability'
      ]
    },
    assessmentInstructions: `
      Assess this application for the ${fund.name} fund.

      Focus on evidence-based evaluation using the specified criteria.
      Consider the fund's success patterns and requirements.
      Provide specific feedback based on application content.

      Score each criterion from 0-100 based on the strength of evidence provided.
    `
  };
}