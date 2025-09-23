import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

// Static imports as fallbacks for the dynamic imports
import { extractTextFromFile } from '@/utils/server-document-analyzer';
import { assessApplicationWithBedrock } from '@/lib/aws-bedrock';
import { deterministicTemplateEngine } from '@/lib/deterministic-template-engine';


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

        console.log('🔍 Using direct AWS Bedrock assessment with enhanced field extraction...');

        // Build RAG context from fund brain
        const ragContext = {
            relevantDocuments: [
                outputTemplatesAnalysis?.rawTemplateContent || 'No template available',
                selectionCriteriaAnalysis?.rawCriteria || 'No criteria available'
            ],
            criteriaText: selectionCriteriaAnalysis?.rawCriteria || 'No selection criteria available',
            goodExamples: goodExamplesAnalysis?.examples || ['No examples available']
        };

        const bedrockResult = await assessApplicationWithBedrock({
            applicationText: applicationContent,
            context: ragContext,
            assessmentType: 'scoring' // This includes field extraction
        });

        // Extract the assessment data from Bedrock result (includes enhanced field extraction)
        const assessmentData = {
            rawAssessment: bedrockResult.feedback || 'Assessment completed',
            extractedFields: {
                // Basic assessment fields
                overallScore: bedrockResult.score || 75,
                strengths: ['Application reviewed with enhanced field extraction'],
                weaknesses: [],
                recommendation: bedrockResult.score >= 70 ? 'Approve' : bedrockResult.score >= 50 ? 'Conditional' : 'Decline',
                // Template-specific fields from enhanced Bedrock extraction (NEW!)
                organizationName: bedrockResult.extractedFields?.organizationName || '[Not extracted]',
                numberOfStudents: bedrockResult.extractedFields?.numberOfStudents || '[Not extracted]',
                fundingAmount: bedrockResult.extractedFields?.fundingAmount || '[Not extracted]',
                businessSummary: bedrockResult.extractedFields?.businessSummary || '[Not extracted]',
                recentRnDActivities: bedrockResult.extractedFields?.recentRnDActivities || '[Not extracted]',
                plannedRnDActivities: bedrockResult.extractedFields?.plannedRnDActivities || '[Not extracted]',
                studentExposureDescription: bedrockResult.extractedFields?.studentExposureDescription || '[Not extracted]',
                // Legacy fields for compatibility
                overallQuality: bedrockResult.score || 75,
                innovation: bedrockResult.score || 75,
                financial: bedrockResult.score || 75,
                team: bedrockResult.score || 75,
                market: bedrockResult.score || 75
            }
        };

        const assessmentResult = {
            success: true,
            strategyUsed: 'ENHANCED_BEDROCK_DIRECT',
            transparencyInfo: {
                userMessage: `Enhanced Bedrock assessment completed with score ${bedrockResult.score || 75}`,
                technicalDetails: 'Used enhanced Claude Bedrock prompt with direct field extraction'
            },
            assessmentData
        };

        // Apply deterministic template formatting (using static import)

        console.log('🎨 Applying template using deterministic template engine');

        // Prepare template config with actual content
        const templateConfig = {
            ...outputTemplatesAnalysis,
            content: outputTemplatesAnalysis?.rawTemplateContent || outputTemplatesAnalysis?.originalContent,
            name: outputTemplatesAnalysis?.filename || 'Output Template'
        };

        // Enhance assessment data with fund context for template engine
        const enhancedAssessmentData = {
            ...assessmentData,
            fundName: fund.name,
            fundId: fund.id,
            assessmentDate: new Date().toISOString(),
            assessorName: 'System Assessment',
            strategyUsed: assessmentResult.strategyUsed,
            transparencyInfo: assessmentResult.transparencyInfo
        };

        const formattedOutput = await deterministicTemplateEngine.applyTemplate(enhancedAssessmentData, templateConfig);

        console.log(`✅ Fund-based assessment complete: ${file.name} - ${assessmentResult.transparencyInfo.userMessage}`);

        // Return the formatted assessment with transparency information
        return NextResponse.json({
            success: true,
            assessment: {
                ...assessmentData,
                formattedOutput: formattedOutput.formattedOutput,
                templateApplied: formattedOutput.success,
                templateName: formattedOutput.metadata?.template_used || 'Deterministic Template',
                templateError: formattedOutput.error,
                strategyUsed: assessmentResult.strategyUsed,
                transparencyInfo: assessmentResult.transparencyInfo
            },
            score: assessmentData.extractedFields?.overallScore || 75,
            feedback: assessmentResult.transparencyInfo.userMessage,
            analysisMode: 'RESILIENT_FUND_ASSESSMENT',
            templateMetadata: formattedOutput.metadata
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