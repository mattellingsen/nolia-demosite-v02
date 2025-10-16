import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { sqsService } from '@/lib/sqs-service';
import { ensureStartup } from '@/lib/startup';

interface RouteParams {
  params: {
    fundId: string;
  };
}

/**
 * Assemble the fund brain from processed document analyses
 * This creates a reusable assessment engine for instant application scoring
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Ensure background processor is started in production
    ensureStartup();

    const { fundId } = await params;

    if (!fundId) {
      return NextResponse.json({
        error: 'Fund ID is required'
      }, { status: 400 });
    }

    // Get fund with all analyses
    const fund = await prisma.funds.findUnique({
      where: { id: fundId },
      include: {
        documents: true,
        backgroundJobs: {
          where: {
            type: 'DOCUMENT_ANALYSIS',
            status: 'COMPLETED'
          },
          orderBy: {
            completedAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!fund) {
      return NextResponse.json({
        error: 'Fund not found'
      }, { status: 404 });
    }

    // Check if document analysis is complete
    if (!fund.background_jobs.length) {
      return NextResponse.json({
        error: 'Document analysis not completed yet'
      }, { status: 400 });
    }

    // Verify we have the necessary analyses (legacy compatibility for outputTemplatesAnalysis)
    const requiredAnalyses = [
      { field: fund.applicationFormAnalysis, name: 'applicationForm' },
      { field: fund.selectionCriteriaAnalysis, name: 'selectionCriteria' },
      { field: fund.goodExamplesAnalysis, name: 'goodExamples' }
    ];

    const missing = requiredAnalyses.filter(analysis => !analysis.field).map(analysis => analysis.name);
    const hasOutputTemplate = fund.outputTemplatesAnalysis !== null && fund.outputTemplatesAnalysis !== undefined;

    if (missing.length > 0) {
      return NextResponse.json({
        error: 'Missing required document analyses',
        missingAnalyses: missing
      }, { status: 400 });
    }

    // Warn about legacy funds without output templates
    if (!hasOutputTemplate) {
      console.log(`⚠️ Fund ${fund.name} is a legacy fund without output templates - brain will use standard formatting`);
    }

    // Assemble the brain from all analyses
    const fundBrain = assembleFundBrain({
      applicationFormAnalysis: fund.applicationFormAnalysis,
      selectionCriteriaAnalysis: fund.selectionCriteriaAnalysis,
      goodExamplesAnalysis: fund.goodExamplesAnalysis,
      outputTemplatesAnalysis: hasOutputTemplate ? fund.outputTemplatesAnalysis : null,
      fundInfo: {
        id: fund.id,
        name: fund.name,
        description: fund.description,
      }
    });

    // Update fund with assembled brain
    const updatedFund = await prisma.funds.update({
      where: { id: fundId },
      data: {
        fundBrain,
        brainVersion: (fund.brainVersion || 0) + 1,
        brainAssembledAt: new Date(),
      }
    });

    // Check if there's already a RAG_PROCESSING job for this fund
    const existingRagJob = await prisma.background_jobs.findFirst({
      where: {
        fundId,
        type: 'RAG_PROCESSING',
        status: {
          in: ['PENDING', 'PROCESSING', 'COMPLETED']
        }
      }
    });

    let brainJob;
    if (existingRagJob) {
      // Update existing job to completed
      brainJob = await prisma.background_jobs.update({
        where: { id: existingRagJob.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          processedDocuments: 1,
          metadata: {
            ...(existingRagJob.metadata as any),
            brainVersion: updatedFund.brainVersion,
            assembledAt: new Date().toISOString(),
            componentsUsed: ['applicationForm', 'selectionCriteria', 'goodExamples']
          },
          completedAt: new Date(),
        }
      });
      console.log(`Updated existing RAG_PROCESSING job ${existingRagJob.id} to completed`);
    } else {
      // Create new brain assembly job record for tracking
      brainJob = await prisma.background_jobs.create({
        data: {
          fundId,
          type: 'RAG_PROCESSING',
          status: 'COMPLETED',
          progress: 100,
          totalDocuments: 1,
          processedDocuments: 1,
          metadata: {
            brainVersion: updatedFund.brainVersion,
            assembledAt: new Date().toISOString(),
            componentsUsed: ['applicationForm', 'selectionCriteria', 'goodExamples']
          },
          startedAt: new Date(),
          completedAt: new Date(),
        }
      });
      console.log(`Created new RAG_PROCESSING job ${brainJob.id}`);
    }

    // Update fund status to ACTIVE when brain assembly is complete
    await prisma.funds.update({
      where: { id: fundId },
      data: { status: 'ACTIVE' }
    });
    console.log(`Fund ${fundId} status updated to ACTIVE`);

    return NextResponse.json({
      success: true,
      brain: {
        version: updatedFund.brainVersion,
        assembledAt: updatedFund.brainAssembledAt,
        jobId: brainJob.id,
        components: Object.keys(fundBrain),
      },
      message: 'Fund brain assembled successfully'
    });

  } catch (error) {
    console.error('Error assembling fund brain:', error);
    return NextResponse.json({
      error: 'Failed to assemble fund brain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get the current brain status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { fundId } = await params;

    const fund = await prisma.funds.findUnique({
      where: { id: fundId },
      select: {
        id: true,
        name: true,
        fundBrain: true,
        brainVersion: true,
        brainAssembledAt: true,
        applicationFormAnalysis: true,
        selectionCriteriaAnalysis: true,
        goodExamplesAnalysis: true,
        outputTemplatesAnalysis: true,
      }
    });

    if (!fund) {
      return NextResponse.json({
        error: 'Fund not found'
      }, { status: 404 });
    }

    const brainStatus = {
      assembled: !!fund.fundBrain,
      version: fund.brainVersion || 0,
      assembledAt: fund.brainAssembledAt,
      canAssemble: !!(fund.applicationFormAnalysis && fund.selectionCriteriaAnalysis && fund.goodExamplesAnalysis),
      missingComponents: [
        !fund.applicationFormAnalysis && 'applicationForm',
        !fund.selectionCriteriaAnalysis && 'selectionCriteria',
        !fund.goodExamplesAnalysis && 'goodExamples'
      ].filter(Boolean),
      hasOutputTemplate: !!(fund.outputTemplatesAnalysis)
    };

    return NextResponse.json({
      success: true,
      brainStatus,
      fundName: fund.name
    });

  } catch (error) {
    console.error('Error getting brain status:', error);
    return NextResponse.json({
      error: 'Failed to get brain status'
    }, { status: 500 });
  }
}

/**
 * Assemble fund brain from document analyses
 * This creates the reusable assessment engine
 */
function assembleFundBrain(data: {
  applicationFormAnalysis: any;
  selectionCriteriaAnalysis: any;
  goodExamplesAnalysis: any;
  outputTemplatesAnalysis: any | null;
  fundInfo: { id: string; name: string; description?: string };
}) {
  const { applicationFormAnalysis, selectionCriteriaAnalysis, goodExamplesAnalysis, outputTemplatesAnalysis, fundInfo } = data;

  return {
    // Metadata
    metadata: {
      fundId: fundInfo.id,
      fundName: fundInfo.name,
      fundDescription: fundInfo.description,
      assembledAt: new Date().toISOString(),
      version: 1,
    },

    // Application form structure and requirements
    applicationStructure: {
      sections: applicationFormAnalysis.sections || [],
      fieldTypes: applicationFormAnalysis.fieldTypes || [],
      questions: applicationFormAnalysis.questionsFound || 0,
      complexity: applicationFormAnalysis.complexity || 'Medium',
      wordCount: applicationFormAnalysis.wordCount || 0,
      extractedSections: applicationFormAnalysis.extractedSections || [],
    },

    // Assessment criteria and scoring methodology
    assessmentCriteria: {
      categories: selectionCriteriaAnalysis.assessmentCategories || [],
      totalCriteria: selectionCriteriaAnalysis.totalCriteria || 0,
      complexity: selectionCriteriaAnalysis.complexity || 'Medium',
      weightings: selectionCriteriaAnalysis.weightings || {},
      scoringMethod: selectionCriteriaAnalysis.scoringMethod || 'weighted',
    },

    // Examples of successful applications for pattern matching
    successPatterns: {
      examples: goodExamplesAnalysis.examples || [],
      averageScore: goodExamplesAnalysis.averageScore || 85,
      commonStrengths: goodExamplesAnalysis.commonStrengths || [],
      keyIndicators: goodExamplesAnalysis.keyIndicators || [],
      successFactors: goodExamplesAnalysis.successFactors || [],
    },

    // Output template configuration for dynamic result formatting (if available)
    ...(outputTemplatesAnalysis ? {
      outputTemplate: {
        templateType: outputTemplatesAnalysis.templateType || 'structured_report',
        format: outputTemplatesAnalysis.format || 'structured_report',
        structure: {
          sections: outputTemplatesAnalysis.sections || outputTemplatesAnalysis.structure?.sections || ["Overview", "Scores", "Feedback", "Recommendations"],
          fields: outputTemplatesAnalysis.structure?.fields || [],
          layout: outputTemplatesAnalysis.structure?.layout || "vertical"
        },
        mappingInstructions: outputTemplatesAnalysis.mappingInstructions || {
          overallScore: "Main score section",
          categoryScores: "Individual scores section",
          feedback: "Feedback section",
          recommendations: "Recommendations section",
          summary: "Executive summary"
        },
        formattingRules: outputTemplatesAnalysis.formattingRules || {
          scoreFormat: "0-100",
          textStyle: "formal",
          lengthGuidelines: "detailed"
        },
        placeholders: outputTemplatesAnalysis.placeholders || [],
        templateSample: outputTemplatesAnalysis.templateSample || "",
        originalContent: outputTemplatesAnalysis.originalContent || "",
        filename: outputTemplatesAnalysis.filename || "output_template.docx"
      }
    } : {}),

    // Assessment engine configuration
    assessmentEngine: {
      model: 'claude-3-5-sonnet-v2',
      assessmentPrompt: generateAssessmentPrompt(selectionCriteriaAnalysis, goodExamplesAnalysis),
      scoringScale: '0-100',
      requiredFields: applicationFormAnalysis.fieldTypes || [],
      outputFormat: 'structured_json',
    },

    // Quality assurance thresholds
    qualityThresholds: {
      minimumScore: 60,
      excellenceThreshold: 85,
      flagForReview: ['incomplete_application', 'unusual_responses', 'extreme_scores'],
      confidenceRequired: 0.8,
    }
  };
}

/**
 * Generate the assessment prompt for the AI engine
 */
function generateAssessmentPrompt(selectionCriteriaAnalysis: any, goodExamplesAnalysis: any): string {
  const categories = selectionCriteriaAnalysis.assessmentCategories || [];
  const examples = goodExamplesAnalysis.examples || [];

  return `You are an expert grant assessor evaluating funding applications.

ASSESSMENT CRITERIA:
${categories.map((cat: any) => `- ${cat.name}: ${cat.description} (Weight: ${cat.weight || 'Equal'})`).join('\n')}

EVALUATION PROCESS:
1. Read the application thoroughly
2. Score each criterion from 0-100 based on evidence in the application
3. Provide specific feedback explaining your scoring
4. Calculate overall score using weighted average

EXAMPLES OF SUCCESSFUL APPLICATIONS:
${examples.slice(0, 3).map((ex: any, i: number) => `
Example ${i + 1} (Score: ${ex.score || 85}/100):
Strengths: ${ex.strengths?.join(', ') || 'Strong application'}
Key factors: ${ex.keyFactors?.join(', ') || 'Clear objectives, good methodology'}
`).join('\n')}

OUTPUT FORMAT:
Return a JSON object with:
{
  "scores": {
    "criterion1": score,
    "criterion2": score,
    ...
  },
  "overallScore": weighted_average,
  "feedback": {
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "suggestions": ["suggestion1", "suggestion2"]
  },
  "confidence": 0.0-1.0,
  "flagForReview": boolean
}

Be thorough, fair, and evidence-based in your assessment.`;
}