import { NextRequest, NextResponse } from 'next/server';
import { analyzeApplicationForm } from '@/utils/server-document-analyzer';

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
        
        // Get the selection criteria (passed as context)
        const criteriaJson = formData.get('criteria') as string;
        const criteria = criteriaJson ? JSON.parse(criteriaJson) : null;
        
        console.log(`🔍 Assessing application: ${file.name}`);
        
        // Analyze the application document
        const analysis = await analyzeApplicationForm(file);
        
        if (!analysis) {
            return NextResponse.json(
                { error: 'Failed to analyze document' },
                { status: 500 }
            );
        }
        
        // Try Claude assessment first
        let assessment;
        try {
            const { assessApplicationWithClaude } = await import('@/utils/claude-document-reasoner');
            const { extractTextFromFile } = await import('@/utils/server-document-analyzer');
            
            // Get application content for Claude analysis
            const applicationContent = await extractTextFromFile(file);
            
            // Get good examples data if available
            const goodExamplesJson = formData.get('goodExamples') as string;
            const goodExamplesData = goodExamplesJson ? JSON.parse(goodExamplesJson) : null;
            
            console.log('🎯 Using Claude AI reasoning for assessment');
            const claudeAssessment = await assessApplicationWithClaude(
                applicationContent,
                file.name,
                criteria,
                goodExamplesData
            );
            
            // Convert Claude assessment to expected format
            assessment = {
                score: claudeAssessment.overallScore,
                innovation: claudeAssessment.categoryScores.innovation,
                financial: claudeAssessment.categoryScores.financial,
                team: claudeAssessment.categoryScores.team,
                market: claudeAssessment.categoryScores.market,
                feedback: claudeAssessment.detailedFeedback,
                strengths: claudeAssessment.strengths,
                weaknesses: claudeAssessment.weaknesses,
                analysisMode: 'CLAUDE_AI_REASONING',
                
                // Enhanced Claude data
                criteriaAlignment: claudeAssessment.criteriaAlignment,
                recommendation: claudeAssessment.recommendation,
                categoryScores: claudeAssessment.categoryScores
            };
            
            console.log(`✅ Claude assessment complete: ${claudeAssessment.overallScore}% (${claudeAssessment.recommendation.decision})`);
            
        } catch (claudeError) {
            console.log('🤖 Claude assessment failed, using basic evaluation:', {
                error: claudeError instanceof Error ? claudeError.message : claudeError
            });
            
            // Fallback to basic assessment
            console.log('📋 Using basic pattern matching for assessment');
            assessment = evaluateApplication(analysis, criteria);
            assessment.analysisMode = 'BASIC_FALLBACK';
        }
        
        console.log(`✅ Assessment complete for ${file.name}: Score ${assessment.score}`);
        
        return NextResponse.json(assessment);
        
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
    const sectionNames = analysis.sections.map(s => s.toLowerCase());
    
    // Innovation score (check for innovation-related content)
    let innovationScore = 70;
    if (sectionNames.some(s => s.includes('innovation') || s.includes('novel') || s.includes('unique'))) {
        innovationScore += 15;
        strengths.push('Clear innovation strategy presented');
    }
    if (analysis.complexity === 'Complex') {
        innovationScore += 10;
    }
    
    // Financial score (check for budget/financial content)
    let financialScore = 65;
    if (sectionNames.some(s => s.includes('budget') || s.includes('financial') || s.includes('cost'))) {
        financialScore += 20;
        strengths.push('Comprehensive budget and financial planning');
    } else {
        weaknesses.push('Limited financial information provided');
    }
    
    // Team score (check for team/experience content)
    let teamScore = 70;
    if (sectionNames.some(s => s.includes('team') || s.includes('experience') || s.includes('qualification'))) {
        teamScore += 15;
        strengths.push('Strong team credentials and experience');
    }
    if (sectionNames.some(s => s.includes('partner') || s.includes('collaboration'))) {
        teamScore += 10;
    }
    
    // Market score (check for market/impact content)
    let marketScore = 68;
    if (sectionNames.some(s => s.includes('market') || s.includes('impact') || s.includes('outcome'))) {
        marketScore += 17;
        strengths.push('Clear market understanding and impact metrics');
    }
    if (sectionNames.some(s => s.includes('competitor') || s.includes('analysis'))) {
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
        if (!sectionNames.some(s => s.includes('timeline') || s.includes('milestone'))) {
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
                if (sectionNames.some(s => s.includes('innovation') || s.includes('novel') || s.includes('new'))) {
                    score += 8;
                } else if (textContent.includes('innovation') || textContent.includes('novel')) {
                    score += 5;
                }
            }
            if (reqLower.includes('technical') || reqLower.includes('feasibility')) {
                if (sectionNames.some(s => s.includes('technical') || s.includes('method') || s.includes('approach'))) {
                    score += 8;
                } else if (textContent.includes('technical') || textContent.includes('methodology')) {
                    score += 5;
                }
            }
        }
        
        if (categoryName.toLowerCase().includes('financial') || categoryName.toLowerCase().includes('commercial')) {
            if (reqLower.includes('budget') || reqLower.includes('financial') || reqLower.includes('cost')) {
                if (sectionNames.some(s => s.includes('budget') || s.includes('financial') || s.includes('cost'))) {
                    score += 8;
                } else if (textContent.includes('budget') || textContent.includes('financial')) {
                    score += 5;
                }
            }
        }
        
        if (categoryName.toLowerCase().includes('team') || categoryName.toLowerCase().includes('capability')) {
            if (reqLower.includes('team') || reqLower.includes('experience') || reqLower.includes('qualification')) {
                if (sectionNames.some(s => s.includes('team') || s.includes('experience') || s.includes('staff'))) {
                    score += 8;
                } else if (textContent.includes('team') || textContent.includes('experience')) {
                    score += 5;
                }
            }
        }
        
        if (categoryName.toLowerCase().includes('market') || categoryName.toLowerCase().includes('impact')) {
            if (reqLower.includes('market') || reqLower.includes('impact') || reqLower.includes('outcome')) {
                if (sectionNames.some(s => s.includes('market') || s.includes('impact') || s.includes('outcome'))) {
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