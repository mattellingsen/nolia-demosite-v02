import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

// Static imports as fallbacks for the dynamic imports
import { extractTextFromFile } from '@/utils/server-document-analyzer';
import { resilientAssessmentService } from '@/lib/resilient-assessment-service';


export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Get the test application file
        const file = formData.get('application') as File;
        if (!file) {
            return NextResponse.json(
                { error: 'No application file provided' },
                { status: 400 }
            );
        }

        // Check if we have a fund ID (new approach) or criteria (legacy)
        const fundId = formData.get('fundId') as string;
        const criteriaJson = formData.get('criteria') as string;
        const criteria = criteriaJson ? JSON.parse(criteriaJson) : null;

        // V2 only supports fund-based assessment
        if (!fundId) {
            return NextResponse.json(
                { error: 'Fund ID is required for V2 assessment' },
                { status: 400 }
            );
        }

        return await handleFundBasedAssessment(file, fundId);
        
    } catch (error) {
        console.error('Error in test assessment:', error);
        return NextResponse.json(
            {
                error: 'Failed to assess application',
                details: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}


/**
 * Handle fund-based assessment using the universal template system
 */
async function handleFundBasedAssessment(file: File, fundId: string) {
    console.log(`🎯 Fund-based assessment: ${file.name} against fund ${fundId}`);

    try {
        // Get the fund with its analyzed data
        const fund = await prisma.fund.findUnique({
            where: { id: fundId },
            include: { documents: true }
        });

        if (!fund) {
            return NextResponse.json(
                { error: 'Fund not found' },
                { status: 404 }
            );
        }

        // Get application content (using static import)
        const applicationContent = await extractTextFromFile(file);

        // Get complete fund brain with all 4 document types
        const applicationFormAnalysis = fund.applicationFormAnalysis as any;
        const selectionCriteriaAnalysis = fund.selectionCriteriaAnalysis as any;
        const goodExamplesAnalysis = fund.goodExamplesAnalysis as any;
        const outputTemplatesAnalysis = fund.outputTemplatesAnalysis as any;
        const fundBrain = fund.fundBrain as any;

        // Build complete fund brain using existing analysis
        const completeFundBrain = {
            fundName: fund.name,
            fundId: fund.id,

            // Application Form Understanding
            applicationFormStructure: applicationFormAnalysis?.structure || null,
            expectedFields: applicationFormAnalysis?.fields || [],
            formInstructions: applicationFormAnalysis?.instructions || null,

            // Selection Criteria (existing)
            criteria: selectionCriteriaAnalysis?.categories || [],
            weightings: selectionCriteriaAnalysis?.weightings || [],
            scoringRubric: selectionCriteriaAnalysis?.rubric || null,

            // Good Examples Learning
            successPatterns: goodExamplesAnalysis?.patterns || {
                averageScore: 85,
                commonStrengths: ['Clear objectives', 'Strong team'],
                keyIndicators: ['Innovation', 'Feasibility']
            },
            exampleQualities: goodExamplesAnalysis?.qualities || [],

            // Output Template Rules
            templateStructure: outputTemplatesAnalysis?.structure || null,
            templateInstructions: outputTemplatesAnalysis?.instructions || null,
            requiredSections: outputTemplatesAnalysis?.sections || [],

            // Assembled Brain Intelligence (if available)
            brainIntelligence: fundBrain || null,

            // Assessment Instructions
            assessmentInstructions: `Assess this application for ${fund.name} using the complete fund brain intelligence including application form understanding, selection criteria, good examples patterns, and output template requirements.`
        };

        console.log('🧠 Using resilient assessment service with single-stage template reasoning...');

        // Use new resilient assessment service
        const resilientResult = await resilientAssessmentService.assess(
            applicationContent,
            completeFundBrain,
            file.name
        );

        // Check if resilient assessment succeeded
        if (!resilientResult.success) {
            return NextResponse.json({
                success: false,
                error: 'Assessment failed',
                details: resilientResult.error || 'Unknown error from resilient assessment service'
            }, { status: 500 });
        }

        // Extract assessment data from resilient assessment result
        const assessmentData = resilientResult.assessmentData;
        const extractedFields = assessmentData.extractedFields || {};

        // Build compatible assessment result for the existing template engine
        const assessmentResult = {
            success: true,
            strategyUsed: resilientResult.strategyUsed.name,
            transparencyInfo: resilientResult.transparencyInfo,
            assessmentData: {
                rawAssessment: assessmentData.rawAssessment || assessmentData.filledTemplate || 'Assessment completed',
                extractedFields: {
                    // Basic assessment fields
                    overallScore: extractedFields.overallScore || 75,
                    strengths: extractedFields.strengths || ['Assessment completed with template reasoning'],
                    weaknesses: extractedFields.weaknesses || [],
                    recommendation: extractedFields.recommendation || 'Review Required',
                    // Legacy fields for compatibility
                    overallQuality: extractedFields.overallScore || 75,
                    innovation: extractedFields.overallScore || 75,
                    financial: extractedFields.overallScore || 75,
                    team: extractedFields.overallScore || 75,
                    market: extractedFields.overallScore || 75
                },
                // Include the filled template if available
                filledTemplate: assessmentData.filledTemplate,
                templateFormat: assessmentData.templateFormat
            }
        };

        // Use the filled template from resilient assessment service
        console.log('✅ Using filled template from resilient assessment service');

        const formattedOutput = {
            success: true,
            formattedOutput: assessmentData.filledTemplate || assessmentData.rawAssessment,
            templateApplied: !!assessmentData.filledTemplate,
            templateFormat: assessmentData.templateFormat || 'filled_template'
        };

        console.log(`✅ Fund-based assessment complete: ${file.name} - ${assessmentResult.transparencyInfo.userMessage}`);

        // Return the formatted assessment with transparency information
        return NextResponse.json({
            success: true,
            assessment: {
                ...assessmentData,
                formattedOutput: formattedOutput.formattedOutput,
                templateApplied: formattedOutput.success,
                templateName: 'Resilient Assessment Template',
                templateError: null,
                strategyUsed: assessmentResult.strategyUsed,
                transparencyInfo: assessmentResult.transparencyInfo
            },
            score: assessmentData.extractedFields?.overallScore || 75,
            feedback: assessmentResult.transparencyInfo.userMessage,
            analysisMode: 'RESILIENT_FUND_ASSESSMENT',
            templateMetadata: null
        });

    } catch (error) {
        // Enhanced error handling and diagnosis
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error('❌ Fund-based assessment error:', {
            error: errorMessage,
            stack: errorStack,
            fundId,
            fileName: file.name,
            errorType: error?.constructor?.name || 'Unknown',
            timestamp: new Date().toISOString()
        });

        // Detailed error classification for better debugging
        let specificErrorMessage = 'Failed to assess application using fund template';
        let errorCategory = 'UNKNOWN_ERROR';

        if (errorMessage.includes('credentials') || errorMessage.includes('authentication') || errorMessage.includes('Forbidden') || errorMessage.includes('Access Denied')) {
            specificErrorMessage = 'AWS authentication failed - Please check AWS credentials and permissions';
            errorCategory = 'AWS_AUTH_ERROR';
        } else if (errorMessage.includes('Bedrock') || errorMessage.includes('bedrock')) {
            specificErrorMessage = 'AWS Bedrock service error - Please check service availability and model access';
            errorCategory = 'BEDROCK_ERROR';
        } else if (errorMessage.includes('mammoth') || errorMessage.includes('PDF') || errorMessage.includes('document')) {
            specificErrorMessage = 'Document processing error - Please check file format and content';
            errorCategory = 'DOCUMENT_ERROR';
        } else if (errorMessage.includes('template') || errorMessage.includes('Template')) {
            specificErrorMessage = 'Template processing error - Please check template configuration';
            errorCategory = 'TEMPLATE_ERROR';
        } else if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
            specificErrorMessage = 'Database error - Please check database connectivity';
            errorCategory = 'DATABASE_ERROR';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
            specificErrorMessage = 'Service timeout - Please try again or contact support';
            errorCategory = 'TIMEOUT_ERROR';
        }

        return NextResponse.json(
            {
                error: specificErrorMessage,
                details: errorMessage,
                errorCategory,
                fundId,
                fileName: file.name,
                timestamp: new Date().toISOString(),
                troubleshooting: {
                    AWS_AUTH_ERROR: 'Run: aws sso login --profile springload-dev',
                    BEDROCK_ERROR: 'Check AWS Bedrock service status and model permissions',
                    DOCUMENT_ERROR: 'Ensure document is a valid Word (.docx) file with text content',
                    TEMPLATE_ERROR: 'Verify fund has proper output template configuration',
                    DATABASE_ERROR: 'Check database connectivity and fund data',
                    TIMEOUT_ERROR: 'Service is busy, please retry in a few moments'
                }[errorCategory] || 'Contact technical support with error details'
            },
            { status: 500 }
        );
    }
}