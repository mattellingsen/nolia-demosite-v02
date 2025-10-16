import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { sqsService } from '@/lib/sqs-service';
import { ensureStartup } from '@/lib/startup';
import { BackgroundJobService } from '@/lib/background-job-service';

interface RouteParams {
  params: {
    baseId: string;
  };
}

/**
 * Assemble the worldbank base brain from processed document analyses
 * This creates a reusable assessment engine for worldbank assessments
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Ensure background processor is started in production
    ensureStartup();

    const { baseId } = await params;

    if (!baseId) {
      return NextResponse.json({
        error: 'Base ID is required'
      }, { status: 400 });
    }

    // Get worldbank base with all analyses
    const worldbankBase = await prisma.funds.findUnique({
      where: {
        id: baseId,
        moduleType: 'WORLDBANK'
      },
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

    if (!worldbankBase) {
      return NextResponse.json({
        error: 'Worldbank base not found'
      }, { status: 404 });
    }

    // Check if document analysis is complete
    if (!worldbankBase.background_jobs.length) {
      return NextResponse.json({
        error: 'Document analysis not completed yet'
      }, { status: 400 });
    }

    // For worldbank, we expect different types of documents
    // Map the existing document analyses to worldbank-specific structure
    const worldbankAnalyses = {
      policies: worldbankBase.applicationFormAnalysis, // Reuse for policies
      procedures: worldbankBase.selectionCriteriaAnalysis, // Reuse for procedures
      templates: worldbankBase.goodExamplesAnalysis, // Reuse for templates
      standards: worldbankBase.outputTemplatesAnalysis // Reuse for standards
    };

    // Check if we have sufficient analyses for brain assembly
    const hasRequiredAnalyses = !!(worldbankAnalyses.policies || worldbankAnalyses.procedures);

    if (!hasRequiredAnalyses) {
      return NextResponse.json({
        error: 'Insufficient document analyses for brain assembly',
        details: 'At least policies or procedures analysis is required'
      }, { status: 400 });
    }

    // Assemble the worldbank brain from all analyses
    const worldbankBrain = assembleWorldbankBrain({
      policies: worldbankAnalyses.policies,
      procedures: worldbankAnalyses.procedures,
      templates: worldbankAnalyses.templates,
      standards: worldbankAnalyses.standards,
      baseInfo: {
        id: worldbankBase.id,
        name: worldbankBase.name,
        description: worldbankBase.description,
      }
    });

    // Update worldbank base with assembled brain
    const updatedBase = await prisma.funds.update({
      where: { id: baseId },
      data: {
        fundBrain: worldbankBrain,
        brainVersion: (worldbankBase.brainVersion || 0) + 1,
        brainAssembledAt: new Date(),
      }
    });

    // Check if there's already a RAG_PROCESSING job for this base
    const existingRagJob = await prisma.background_jobs.findFirst({
      where: {
        fundId: baseId,
        type: 'RAG_PROCESSING',
        status: {
          in: ['PENDING', 'PROCESSING', 'COMPLETED']
        }
      }
    });

    // Get actual document count
    const documentCount = worldbankBase.fund_documents.length;

    console.log(`🚀 Starting RAG processing for worldbank base ${baseId} with ${documentCount} documents`);

    // Actually process the RAG job to generate embeddings and store in OpenSearch
    let brainJob;
    if (existingRagJob && existingRagJob.status === 'PENDING') {
      // Job exists and is pending - process it now
      console.log(`Processing existing PENDING RAG job ${existingRagJob.id}`);
      brainJob = existingRagJob;

      // Process in background (non-blocking)
      BackgroundJobService.processRAGJob(existingRagJob.id)
        .then(() => {
          console.log(`✅ RAG processing completed for job ${existingRagJob.id}`);
          // Update fund status to ACTIVE after RAG completes (preserve fundBrain)
          return prisma.funds.update({
            where: { id: baseId },
            data: {
              status: 'ACTIVE',
              openSearchIndex: `worldbank-documents`, // Store index name
              fundBrain: updatedBase.fundBrain,
              brainAssembledAt: updatedBase.brainAssembledAt,
              brainVersion: updatedBase.brainVersion
            }
          });
        })
        .catch(error => {
          console.error(`❌ RAG processing failed for job ${existingRagJob.id}:`, error);
        });
    } else if (existingRagJob && existingRagJob.status === 'COMPLETED') {
      // Already completed
      console.log(`RAG job already completed: ${existingRagJob.id}`);
      brainJob = existingRagJob;

      // Update status to ACTIVE if not already (preserve fundBrain from earlier update)
      await prisma.funds.update({
        where: { id: baseId },
        data: {
          status: 'ACTIVE',
          openSearchIndex: `worldbank-documents`,
          fundBrain: updatedBase.fundBrain,
          brainAssembledAt: updatedBase.brainAssembledAt,
          brainVersion: updatedBase.brainVersion
        }
      });
    } else {
      // No job exists - create one and process it
      console.log(`Creating new RAG_PROCESSING job for ${baseId}`);
      brainJob = await prisma.background_jobs.create({
        data: {
          fundId: baseId,
          type: 'RAG_PROCESSING',
          status: 'PENDING',
          progress: 0,
          totalDocuments: documentCount,
          processedDocuments: 0,
          moduleType: 'WORLDBANK',
          metadata: {
            brainVersion: updatedBase.brainVersion,
            createdAt: new Date().toISOString(),
          }
        }
      });

      console.log(`Processing new RAG job ${brainJob.id}`);

      // Process in background (non-blocking)
      BackgroundJobService.processRAGJob(brainJob.id)
        .then(() => {
          console.log(`✅ RAG processing completed for job ${brainJob.id}`);
          // Update fund status to ACTIVE after RAG completes (preserve fundBrain)
          return prisma.funds.update({
            where: { id: baseId },
            data: {
              status: 'ACTIVE',
              openSearchIndex: `worldbank-documents`,
              fundBrain: updatedBase.fundBrain,
              brainAssembledAt: updatedBase.brainAssembledAt,
              brainVersion: updatedBase.brainVersion
            }
          });
        })
        .catch(error => {
          console.error(`❌ RAG processing failed for job ${brainJob.id}:`, error);
        });
    }

    console.log(`Worldbank brain assembly initiated for ${baseId}`);

    return NextResponse.json({
      success: true,
      brain: {
        version: updatedBase.brainVersion,
        assembledAt: updatedBase.brainAssembledAt,
        jobId: brainJob.id,
        components: Object.keys(worldbankBrain),
      },
      message: 'Worldbank brain assembled successfully'
    });

  } catch (error) {
    console.error('Error assembling worldbank brain:', error);
    return NextResponse.json({
      error: 'Failed to assemble worldbank brain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get the current worldbank brain status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { baseId } = await params;

    const worldbankBase = await prisma.funds.findUnique({
      where: {
        id: baseId,
        moduleType: 'WORLDBANK'
      },
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

    if (!worldbankBase) {
      return NextResponse.json({
        error: 'Worldbank base not found'
      }, { status: 404 });
    }

    const brainStatus = {
      assembled: !!worldbankBase.fundBrain,
      version: worldbankBase.brainVersion || 0,
      assembledAt: worldbankBase.brainAssembledAt,
      canAssemble: !!(worldbankBase.applicationFormAnalysis || worldbankBase.selectionCriteriaAnalysis),
      missingComponents: [
        !worldbankBase.applicationFormAnalysis && 'policies',
        !worldbankBase.selectionCriteriaAnalysis && 'procedures',
        !worldbankBase.goodExamplesAnalysis && 'templates',
        !worldbankBase.outputTemplatesAnalysis && 'standards'
      ].filter(Boolean),
      hasAllComponents: !!(
        worldbankBase.applicationFormAnalysis &&
        worldbankBase.selectionCriteriaAnalysis &&
        worldbankBase.goodExamplesAnalysis &&
        worldbankBase.outputTemplatesAnalysis
      )
    };

    return NextResponse.json({
      success: true,
      brainStatus,
      baseName: worldbankBase.name
    });

  } catch (error) {
    console.error('Error getting worldbank brain status:', error);
    return NextResponse.json({
      error: 'Failed to get worldbank brain status'
    }, { status: 500 });
  }
}

/**
 * Assemble worldbank brain from document analyses
 * This creates the reusable worldbank assessment engine
 */
function assembleWorldbankBrain(data: {
  policies: any;
  procedures: any;
  templates: any;
  standards: any;
  baseInfo: { id: string; name: string; description?: string };
}) {
  const { policies, procedures, templates, standards, baseInfo } = data;

  return {
    // Metadata
    metadata: {
      baseId: baseInfo.id,
      baseName: baseInfo.name,
      baseDescription: baseInfo.description,
      assembledAt: new Date().toISOString(),
      version: 1,
      moduleType: 'WORLDBANK'
    },

    // Worldbank policies structure
    ...(policies ? {
      policies: {
        sections: policies.sections || [],
        requirements: policies.requirements || [],
        compliance: policies.compliance || [],
        processes: policies.processes || [],
        complexity: policies.complexity || 'Medium',
        wordCount: policies.wordCount || 0,
      }
    } : {}),

    // Worldbank procedures and workflows
    ...(procedures ? {
      procedures: {
        workflows: procedures.workflows || [],
        steps: procedures.steps || [],
        approvals: procedures.approvals || [],
        timelines: procedures.timelines || [],
        stakeholders: procedures.stakeholders || [],
        complexity: procedures.complexity || 'Medium',
      }
    } : {}),

    // Document templates and formats
    ...(templates ? {
      templates: {
        documentTypes: templates.documentTypes || [],
        formats: templates.formats || [],
        requirements: templates.requirements || [],
        examples: templates.examples || [],
        structure: templates.structure || [],
      }
    } : {}),

    // Standards and guidelines
    ...(standards ? {
      standards: {
        guidelines: standards.guidelines || [],
        criteria: standards.criteria || [],
        compliance: standards.compliance || [],
        benchmarks: standards.benchmarks || [],
        metrics: standards.metrics || [],
      }
    } : {}),

    // Worldbank assessment engine configuration
    assessmentEngine: {
      model: 'claude-3-5-sonnet-v2',
      assessmentPrompt: generateWorldbankAssessmentPrompt(policies, procedures, templates, standards),
      scoringScale: '0-100',
      outputFormat: 'structured_json',
      moduleType: 'WORLDBANK'
    },

    // Quality assurance thresholds for worldbank
    qualityThresholds: {
      minimumScore: 60,
      excellenceThreshold: 85,
      flagForReview: ['incomplete_submission', 'non_compliant', 'unusual_requirements'],
      confidenceRequired: 0.8,
    }
  };
}

/**
 * Generate the worldbank assessment prompt for the AI engine
 */
function generateWorldbankAssessmentPrompt(policies: any, procedures: any, templates: any, standards: any): string {
  const components = [
    policies && 'policies',
    procedures && 'procedures',
    templates && 'templates',
    standards && 'standards'
  ].filter(Boolean);

  return `You are an expert worldbank assessor evaluating worldbank submissions and processes.

ASSESSMENT COMPONENTS AVAILABLE:
${components.map(comp => `- ${comp}: Analyze compliance with ${comp}`).join('\n')}

EVALUATION PROCESS:
1. Review the submission thoroughly against available components
2. Score compliance from 0-100 for each relevant area
3. Provide specific feedback on compliance and recommendations
4. Calculate overall score based on component weightings

WORLDBANK FOCUS AREAS:
- Policy compliance and adherence
- Process efficiency and effectiveness
- Documentation completeness and quality
- Standards alignment and best practices

OUTPUT FORMAT:
Return a JSON object with:
{
  "scores": {
    "compliance": score,
    "efficiency": score,
    "documentation": score,
    "standards": score
  },
  "overallScore": weighted_average,
  "feedback": {
    "strengths": ["strength1", "strength2"],
    "gaps": ["gap1", "gap2"],
    "recommendations": ["recommendation1", "recommendation2"]
  },
  "confidence": 0.0-1.0,
  "flagForReview": boolean
}

Be thorough, compliance-focused, and evidence-based in your assessment.`;
}
