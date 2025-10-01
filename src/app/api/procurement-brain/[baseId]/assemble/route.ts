import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { sqsService } from '@/lib/sqs-service';
import { ensureStartup } from '@/lib/startup';

interface RouteParams {
  params: {
    baseId: string;
  };
}

/**
 * Assemble the procurement base brain from processed document analyses
 * This creates a reusable assessment engine for procurement assessments
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

    // Get procurement base with all analyses
    const procurementBase = await prisma.fund.findUnique({
      where: {
        id: baseId,
        moduleType: 'PROCUREMENT_ADMIN'
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

    if (!procurementBase) {
      return NextResponse.json({
        error: 'Procurement base not found'
      }, { status: 404 });
    }

    // Check if document analysis is complete
    if (!procurementBase.backgroundJobs.length) {
      return NextResponse.json({
        error: 'Document analysis not completed yet'
      }, { status: 400 });
    }

    // For procurement, we expect different types of documents
    // Map the existing document analyses to procurement-specific structure
    const procurementAnalyses = {
      policies: procurementBase.applicationFormAnalysis, // Reuse for policies
      procedures: procurementBase.selectionCriteriaAnalysis, // Reuse for procedures
      templates: procurementBase.goodExamplesAnalysis, // Reuse for templates
      standards: procurementBase.outputTemplatesAnalysis // Reuse for standards
    };

    // Check if we have sufficient analyses for brain assembly
    const hasRequiredAnalyses = !!(procurementAnalyses.policies || procurementAnalyses.procedures);

    if (!hasRequiredAnalyses) {
      return NextResponse.json({
        error: 'Insufficient document analyses for brain assembly',
        details: 'At least policies or procedures analysis is required'
      }, { status: 400 });
    }

    // Assemble the procurement brain from all analyses
    const procurementBrain = assembleProcurementBrain({
      policies: procurementAnalyses.policies,
      procedures: procurementAnalyses.procedures,
      templates: procurementAnalyses.templates,
      standards: procurementAnalyses.standards,
      baseInfo: {
        id: procurementBase.id,
        name: procurementBase.name,
        description: procurementBase.description,
      }
    });

    // Update procurement base with assembled brain
    const updatedBase = await prisma.fund.update({
      where: { id: baseId },
      data: {
        fundBrain: procurementBrain,
        brainVersion: (procurementBase.brainVersion || 0) + 1,
        brainAssembledAt: new Date(),
      }
    });

    // Check if there's already a RAG_PROCESSING job for this base
    const existingRagJob = await prisma.backgroundJob.findFirst({
      where: {
        fundId: baseId,
        type: 'RAG_PROCESSING',
        status: {
          in: ['PENDING', 'PROCESSING', 'COMPLETED']
        }
      }
    });

    let brainJob;
    if (existingRagJob) {
      // Update existing job to completed
      brainJob = await prisma.backgroundJob.update({
        where: { id: existingRagJob.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          processedDocuments: 1,
          metadata: {
            ...(existingRagJob.metadata as any),
            brainVersion: updatedBase.brainVersion,
            assembledAt: new Date().toISOString(),
            componentsUsed: ['policies', 'procedures', 'templates', 'standards'].filter(key =>
              procurementAnalyses[key as keyof typeof procurementAnalyses]
            )
          },
          completedAt: new Date(),
        }
      });
      console.log(`Updated existing RAG_PROCESSING job ${existingRagJob.id} to completed`);
    } else {
      // Create new brain assembly job record for tracking
      brainJob = await prisma.backgroundJob.create({
        data: {
          fundId: baseId,
          type: 'RAG_PROCESSING',
          status: 'COMPLETED',
          progress: 100,
          totalDocuments: 1,
          processedDocuments: 1,
          moduleType: 'PROCUREMENT_ADMIN',
          metadata: {
            brainVersion: updatedBase.brainVersion,
            assembledAt: new Date().toISOString(),
            componentsUsed: ['policies', 'procedures', 'templates', 'standards'].filter(key =>
              procurementAnalyses[key as keyof typeof procurementAnalyses]
            )
          },
          startedAt: new Date(),
          completedAt: new Date(),
        }
      });
      console.log(`Created new RAG_PROCESSING job ${brainJob.id}`);
    }

    // Update procurement base status to ACTIVE when brain assembly is complete
    await prisma.fund.update({
      where: { id: baseId },
      data: { status: 'ACTIVE' }
    });
    console.log(`Procurement base ${baseId} status updated to ACTIVE`);

    return NextResponse.json({
      success: true,
      brain: {
        version: updatedBase.brainVersion,
        assembledAt: updatedBase.brainAssembledAt,
        jobId: brainJob.id,
        components: Object.keys(procurementBrain),
      },
      message: 'Procurement brain assembled successfully'
    });

  } catch (error) {
    console.error('Error assembling procurement brain:', error);
    return NextResponse.json({
      error: 'Failed to assemble procurement brain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get the current procurement brain status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { baseId } = await params;

    const procurementBase = await prisma.fund.findUnique({
      where: {
        id: baseId,
        moduleType: 'PROCUREMENT_ADMIN'
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

    if (!procurementBase) {
      return NextResponse.json({
        error: 'Procurement base not found'
      }, { status: 404 });
    }

    const brainStatus = {
      assembled: !!procurementBase.fundBrain,
      version: procurementBase.brainVersion || 0,
      assembledAt: procurementBase.brainAssembledAt,
      canAssemble: !!(procurementBase.applicationFormAnalysis || procurementBase.selectionCriteriaAnalysis),
      missingComponents: [
        !procurementBase.applicationFormAnalysis && 'policies',
        !procurementBase.selectionCriteriaAnalysis && 'procedures',
        !procurementBase.goodExamplesAnalysis && 'templates',
        !procurementBase.outputTemplatesAnalysis && 'standards'
      ].filter(Boolean),
      hasAllComponents: !!(
        procurementBase.applicationFormAnalysis &&
        procurementBase.selectionCriteriaAnalysis &&
        procurementBase.goodExamplesAnalysis &&
        procurementBase.outputTemplatesAnalysis
      )
    };

    return NextResponse.json({
      success: true,
      brainStatus,
      baseName: procurementBase.name
    });

  } catch (error) {
    console.error('Error getting procurement brain status:', error);
    return NextResponse.json({
      error: 'Failed to get procurement brain status'
    }, { status: 500 });
  }
}

/**
 * Assemble procurement brain from document analyses
 * This creates the reusable procurement assessment engine
 */
function assembleProcurementBrain(data: {
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
      moduleType: 'PROCUREMENT_ADMIN'
    },

    // Procurement policies structure
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

    // Procurement procedures and workflows
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

    // Procurement assessment engine configuration
    assessmentEngine: {
      model: 'claude-3-5-sonnet-v2',
      assessmentPrompt: generateProcurementAssessmentPrompt(policies, procedures, templates, standards),
      scoringScale: '0-100',
      outputFormat: 'structured_json',
      moduleType: 'PROCUREMENT_ADMIN'
    },

    // Quality assurance thresholds for procurement
    qualityThresholds: {
      minimumScore: 60,
      excellenceThreshold: 85,
      flagForReview: ['incomplete_submission', 'non_compliant', 'unusual_requirements'],
      confidenceRequired: 0.8,
    }
  };
}

/**
 * Generate the procurement assessment prompt for the AI engine
 */
function generateProcurementAssessmentPrompt(policies: any, procedures: any, templates: any, standards: any): string {
  const components = [
    policies && 'policies',
    procedures && 'procedures',
    templates && 'templates',
    standards && 'standards'
  ].filter(Boolean);

  return `You are an expert procurement assessor evaluating procurement submissions and processes.

ASSESSMENT COMPONENTS AVAILABLE:
${components.map(comp => `- ${comp}: Analyze compliance with ${comp}`).join('\n')}

EVALUATION PROCESS:
1. Review the submission thoroughly against available components
2. Score compliance from 0-100 for each relevant area
3. Provide specific feedback on compliance and recommendations
4. Calculate overall score based on component weightings

PROCUREMENT FOCUS AREAS:
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