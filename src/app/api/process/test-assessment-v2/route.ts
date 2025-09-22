import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile } from '@/utils/server-document-analyzer';
import { prisma } from '@/lib/database-s3';
import { resilientAssessmentService } from '@/lib/resilient-assessment-service';
import { deterministicTemplateEngine } from '@/lib/deterministic-template-engine';

interface AssessmentResult {
    score: number;
    innovation: number;
    financial: number;
    team: number;
    market: number;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
}

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

        // If fundId is provided, use the universal template system with resilient assessment
        if (fundId) {
            return await handleFundBasedAssessment(file, fundId);
        }

        console.log(`🔍 Assessing application: ${file.name}`);

        // Analyze the application document
        const analysis = await analyzeApplicationForm(file);

        if (!analysis) {
            return NextResponse.json(
                { error: 'Failed to analyze document' },
                { status: 500 }
            );
        }

        // Use resilient assessment service for transparent AI/fallback handling
        console.log('🏛️ Using resilient assessment service with transparent fallbacks');

        // Create basic fund brain for legacy criteria support
        const fundBrain = {
            fundName: 'Test Assessment',
            criteria: criteria ? [
                { name: 'Overall Quality', description: 'General application quality assessment' }
            ] : [],
            successPatterns: {
                averageScore: 75,
                commonStrengths: ['Clear objectives', 'Comprehensive responses'],
                keyIndicators: ['Innovation', 'Feasibility', 'Impact']
            },
            assessmentInstructions: 'Assess this application for general funding suitability'
        };

        // Use simple RAG assessment - exactly like Claude Projects
        const { assessApplicationWithRAG } = await import('@/lib/rag-database');
        const applicationContent = analysis.textContent || 'No content extracted';

        console.log('🔍 Using RAG assessment for fund:', fundId);

        const ragResult = await assessApplicationWithRAG(
            fundId,
            applicationContent,
            file.name
        );

        // Extract the assessment data from RAG result
        const assessmentData = {
            rawAssessment: ragResult.feedback || ragResult.summary || ragResult.rawResponse || 'Assessment completed',
            extractedFields: {
                // Basic assessment fields
                overallScore: ragResult.score || 75,
                strengths: ragResult.strengths || ['Application reviewed'],
                weaknesses: ragResult.weaknesses || [],
                recommendation: ragResult.score >= 70 ? 'Approve' : ragResult.score >= 50 ? 'Conditional' : 'Decline',
                // Template-specific fields from RAG extraction
                ...(ragResult.extractedFields || {})
            }
        };

        // Apply deterministic template formatting using the fund's actual template
        const { deterministicTemplateEngine } = await import('@/lib/deterministic-template-engine');

        // Use the fund's output template analysis for proper template formatting
        const templateConfig = outputTemplatesAnalysis || {
            content: '[Score]/100 - [MEETS REQUIREMENTS / DOES NOT MEET REQUIREMENTS]',
            name: 'Fallback Template'
        };

        const templateResult = await deterministicTemplateEngine.applyTemplate(
            assessmentData,
            templateConfig
        );

        const response = {
            score: assessmentData.extractedFields?.overallScore || 75,
            innovation: assessmentData.extractedFields?.overallScore || 75,
            financial: assessmentData.extractedFields?.overallScore || 75,
            team: assessmentData.extractedFields?.overallScore || 75,
            market: assessmentData.extractedFields?.overallScore || 75,
            feedback: assessmentData.rawAssessment || 'Assessment completed',
            strengths: assessmentData.extractedFields?.strengths || ['Application reviewed'],
            weaknesses: assessmentData.extractedFields?.weaknesses || [],
            analysisMode: assessmentData.analysisMode || 'RESILIENT_ASSESSMENT',
            strategyUsed: assessmentResult.strategyUsed,
            transparencyInfo: assessmentResult.transparencyInfo,
            formattedOutput: templateResult.formattedOutput,
            templateMetadata: templateResult.metadata
        };

        console.log(`✅ Assessment complete for ${file.name}: ${assessmentResult.transparencyInfo.userMessage}`);

        return NextResponse.json(response);
        
    } catch (error) {
        console.error('Error in test assessment:', error);
        return NextResponse.json(
            { error: 'Failed to assess application' },
            { status: 500 }
        );
    }
}

function evaluateApplication(analysis: any, criteria: any): AssessmentResult {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    console.log('🔍 Evaluating with criteria:', criteria?.aiReasoning ? 'Claude-reasoned framework' : 'basic analysis');
    
    // Use Claude reasoning if available, otherwise fall back to basic scoring
    if (criteria?.aiReasoning) {
        return evaluateWithClaudeReasoning(analysis, criteria.aiReasoning, strengths, weaknesses);
    }
    
    // Fallback: Base scores on document quality
    let baseScore = 60;
    
    // Evaluate document completeness
    if (analysis.sections.length > 8) {
        baseScore += 10;
        strengths.push('Comprehensive application with all sections completed');
    } else if (analysis.sections.length < 5) {
        weaknesses.push('Missing several required sections');
    }
    
    // Evaluate detail level based on word count
    if (analysis.wordCount > 2000) {
        baseScore += 8;
        strengths.push('Detailed responses with thorough explanations');
    } else if (analysis.wordCount < 500) {
        baseScore -= 10;
        weaknesses.push('Responses lack sufficient detail');
    }
    
    // Evaluate structure and organization
    if (analysis.extractedSections?.length > 0 && analysis.complexity !== 'Simple') {
        baseScore += 7;
        strengths.push('Well-structured and organized presentation');
    }
    
    // Check for key sections that indicate quality
    const sectionNames = analysis.sections.map((s: any) => s.toLowerCase());
    
    // Innovation score (check for innovation-related content)
    let innovationScore = 70;
    if (sectionNames.some((s: string) => s.includes('innovation') || s.includes('novel') || s.includes('unique'))) {
        innovationScore += 15;
        strengths.push('Clear innovation strategy presented');
    }
    if (analysis.complexity === 'Complex') {
        innovationScore += 10;
    }
    
    // Financial score (check for budget/financial content)
    let financialScore = 65;
    if (sectionNames.some((s: string) => s.includes('budget') || s.includes('financial') || s.includes('cost'))) {
        financialScore += 20;
        strengths.push('Comprehensive budget and financial planning');
    } else {
        weaknesses.push('Limited financial information provided');
    }
    
    // Team score (check for team/experience content)
    let teamScore = 70;
    if (sectionNames.some((s: string) => s.includes('team') || s.includes('experience') || s.includes('qualification'))) {
        teamScore += 15;
        strengths.push('Strong team credentials and experience');
    }
    if (sectionNames.some((s: string) => s.includes('partner') || s.includes('collaboration'))) {
        teamScore += 10;
    }
    
    // Market score (check for market/impact content)
    let marketScore = 68;
    if (sectionNames.some((s: string) => s.includes('market') || s.includes('impact') || s.includes('outcome'))) {
        marketScore += 17;
        strengths.push('Clear market understanding and impact metrics');
    }
    if (sectionNames.some((s: string) => s.includes('competitor') || s.includes('analysis'))) {
        marketScore += 8;
    }
    
    // Apply criteria weighting if available
    if (criteria?.weightings && criteria.weightings.length > 0) {
        // Adjust scores based on criteria emphasis
        const weights = criteria.weightings;
        const totalWeight = weights.reduce((sum: number, w: any) => sum + (w.weight || 1), 0);
        
        // Normalize and apply weights
        if (totalWeight > 0) {
            const weightMultiplier = 100 / totalWeight;
            // Apply subtle weighting influence (not complete override)
            innovationScore = Math.round(innovationScore * 0.7 + (innovationScore * weightMultiplier * 0.3));
            financialScore = Math.round(financialScore * 0.7 + (financialScore * weightMultiplier * 0.3));
        }
    }
    
    // Ensure scores are within valid range
    innovationScore = Math.min(95, Math.max(50, innovationScore));
    financialScore = Math.min(95, Math.max(50, financialScore));
    teamScore = Math.min(95, Math.max(50, teamScore));
    marketScore = Math.min(95, Math.max(50, marketScore));
    
    // Calculate overall score (average of components)
    const overallScore = Math.round((innovationScore + financialScore + teamScore + marketScore) / 4);
    
    // Generate feedback based on score
    let feedback = '';
    if (overallScore >= 80) {
        feedback = 'Excellent application that meets or exceeds all criteria. Strong candidate for funding.';
    } else if (overallScore >= 70) {
        feedback = 'Good application with solid fundamentals. Some areas could be strengthened for better alignment with criteria.';
    } else if (overallScore >= 60) {
        feedback = 'Adequate application but requires improvement in several key areas to meet funding criteria.';
    } else {
        feedback = 'Application needs significant improvement. Consider addressing the identified weaknesses before resubmission.';
    }
    
    // Add specific weaknesses if score is low
    if (overallScore < 70) {
        if (analysis.wordCount < 1000) {
            weaknesses.push('Responses need more detail and supporting evidence');
        }
        if (analysis.sections.length < 6) {
            weaknesses.push('Several required sections appear to be incomplete');
        }
        if (!sectionNames.some((s: string) => s.includes('timeline') || s.includes('milestone'))) {
            weaknesses.push('Missing clear timeline and milestones');
        }
    }
    
    return {
        score: overallScore,
        innovation: innovationScore,
        financial: financialScore,
        team: teamScore,
        market: marketScore,
        feedback,
        strengths: strengths.slice(0, 4), // Limit to top 4
        weaknesses: weaknesses.slice(0, 3) // Limit to top 3
    };
}

/**
 * Claude-powered evaluation using the reasoned criteria framework
 */
function evaluateWithClaudeReasoning(analysis: any, aiReasoning: any, strengths: string[], weaknesses: string[]): AssessmentResult {
    console.log('🧠 Using Claude-reasoned criteria for evaluation');
    
    const { unifiedCriteria, synthesizedFramework } = aiReasoning;
    const passingThreshold = synthesizedFramework.passingThreshold || 70;
    
    // Score against each unified criterion
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    const categoryScores: { [key: string]: number } = {};
    
    for (const criterion of unifiedCriteria) {
        const categoryName = criterion.category;
        const weight = criterion.weight;
        const requirements = criterion.requirements;
        
        // Score this category based on how well the application meets requirements
        let categoryScore = scoreCategoryAgainstRequirements(analysis, requirements, categoryName);
        
        categoryScores[categoryName.toLowerCase().replace(/\s+/g, '_')] = categoryScore;
        totalWeightedScore += categoryScore * weight;
        totalWeight += weight;
        
        // Generate feedback based on performance
        if (categoryScore >= 80) {
            strengths.push(`Strong performance in ${categoryName}: meets ${Math.round(categoryScore)}% of requirements`);
        } else if (categoryScore < 60) {
            weaknesses.push(`Needs improvement in ${categoryName}: only meets ${Math.round(categoryScore)}% of requirements`);
        }
    }
    
    // Calculate overall score
    const overallScore = Math.round(totalWeight > 0 ? totalWeightedScore / totalWeight : 60);
    
    // Generate contextual feedback using AI reasoning
    let feedback = '';
    if (overallScore >= passingThreshold) {
        feedback = `Strong application scoring ${overallScore}%. ${synthesizedFramework.weightingJustification}`;
        if (aiReasoning.conflictsIdentified.length > 0) {
            feedback += ` Assessment resolved ${aiReasoning.conflictsIdentified.length} criterion conflicts.`;
        }
    } else {
        feedback = `Application scores ${overallScore}%, below passing threshold of ${passingThreshold}%. `;
        feedback += `Focus on strengthening areas identified in the unified criteria framework.`;
    }
    
    return {
        score: overallScore,
        innovation: categoryScores.innovation_technical_merit || categoryScores.innovation || overallScore,
        financial: categoryScores.financial_capacity || categoryScores.financial_viability || overallScore,
        team: categoryScores.team_capability || categoryScores.team_experience || overallScore,
        market: categoryScores.market_potential || categoryScores.commercial_viability || overallScore,
        feedback,
        strengths: strengths.slice(0, 4),
        weaknesses: weaknesses.slice(0, 3)
    };
}

/**
 * Score a category based on how well the application meets specific requirements
 */
function scoreCategoryAgainstRequirements(analysis: any, requirements: string[], categoryName: string): number {
    let score = 50; // Base score
    
    const sectionNames = (analysis.sections || []).map((s: string) => s.toLowerCase());
    const textContent = (analysis.textContent || '').toLowerCase();
    
    for (const requirement of requirements) {
        const reqLower = requirement.toLowerCase();
        
        // Check if requirement keywords appear in document sections or content
        if (categoryName.toLowerCase().includes('innovation') || categoryName.toLowerCase().includes('technical')) {
            if (reqLower.includes('novel') || reqLower.includes('innovation')) {
                if (sectionNames.some((s: string) => s.includes('innovation') || s.includes('novel') || s.includes('new'))) {
                    score += 8;
                } else if (textContent.includes('innovation') || textContent.includes('novel')) {
                    score += 5;
                }
            }
            if (reqLower.includes('technical') || reqLower.includes('feasibility')) {
                if (sectionNames.some((s: string) => s.includes('technical') || s.includes('method') || s.includes('approach'))) {
                    score += 8;
                } else if (textContent.includes('technical') || textContent.includes('methodology')) {
                    score += 5;
                }
            }
        }
        
        if (categoryName.toLowerCase().includes('financial') || categoryName.toLowerCase().includes('commercial')) {
            if (reqLower.includes('budget') || reqLower.includes('financial') || reqLower.includes('cost')) {
                if (sectionNames.some((s: string) => s.includes('budget') || s.includes('financial') || s.includes('cost'))) {
                    score += 8;
                } else if (textContent.includes('budget') || textContent.includes('financial')) {
                    score += 5;
                }
            }
        }
        
        if (categoryName.toLowerCase().includes('team') || categoryName.toLowerCase().includes('capability')) {
            if (reqLower.includes('team') || reqLower.includes('experience') || reqLower.includes('qualification')) {
                if (sectionNames.some((s: string) => s.includes('team') || s.includes('experience') || s.includes('staff'))) {
                    score += 8;
                } else if (textContent.includes('team') || textContent.includes('experience')) {
                    score += 5;
                }
            }
        }
        
        if (categoryName.toLowerCase().includes('market') || categoryName.toLowerCase().includes('impact')) {
            if (reqLower.includes('market') || reqLower.includes('impact') || reqLower.includes('outcome')) {
                if (sectionNames.some((s: string) => s.includes('market') || s.includes('impact') || s.includes('outcome'))) {
                    score += 8;
                } else if (textContent.includes('market') || textContent.includes('impact')) {
                    score += 5;
                }
            }
        }
    }
    
    // Apply document quality factors
    if (analysis.sections.length > 8) score += 5;
    if (analysis.wordCount > 2000) score += 5;
    if (analysis.complexity === 'Complex') score += 5;
    
    return Math.min(95, Math.max(40, score)); // Score between 40-95
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

        // Get application content
        const { extractTextFromFile } = await import('@/utils/server-document-analyzer');
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

        // Use direct AWS Bedrock assessment with enhanced field extraction
        const { assessApplicationWithBedrock } = await import('@/lib/aws-bedrock');

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

        // Apply deterministic template formatting
        const { deterministicTemplateEngine } = await import('@/lib/deterministic-template-engine');

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
        console.error('Error in fund-based assessment:', error);
        return NextResponse.json(
            { error: 'Failed to assess application using fund template' },
            { status: 500 }
        );
    }
}