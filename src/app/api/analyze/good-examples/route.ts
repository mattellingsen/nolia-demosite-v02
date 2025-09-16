import { NextRequest, NextResponse } from 'next/server';

interface QualityIndicator {
    name: string;
    score: number;
    description: string;
}

export async function POST(request: NextRequest) {
    console.log('📊 Good examples endpoint called');
    
    try {
        console.log('📊 Parsing form data...');
        const formData = await request.formData();
        const files: any[] = [];
        
        // Collect all files from FormData
        for (const [key, value] of formData.entries()) {
            // Check if it's a file-like object (has name and size properties)
            if (value && typeof value === 'object' && 'name' in value && 'size' in value) {
                console.log(`📊 Found file: ${(value as any).name}, size: ${(value as any).size}`);
                files.push(value);
            }
        }
        
        if (files.length === 0) {
            console.log('📊 No files provided in request');
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            );
        }
        
        console.log(`📊 Analyzing ${files.length} good example files for quality assessment`);
        
        // Try Claude reasoning first
        try {
            const { analyzeGoodExamplesWithClaude } = await import('@/utils/claude-document-reasoner');
            const { extractTextFromFile, extractSections } = await import('@/utils/server-document-analyzer');
            
            // Prepare document contexts for Claude analysis
            const documentContexts = [];
            for (const file of files) {
                const text = await extractTextFromFile(file);
                const sections = extractSections(text);
                
                // Limit content size for faster processing
                const optimizedContent = text.length > 3000 ? text.substring(0, 3000) + '...' : text;
                
                documentContexts.push({
                    filename: file.name,
                    content: optimizedContent,
                    extractedSections: sections.map(s => s.title || s.toString()).slice(0, 20)
                });
            }
            
            console.log('🏆 Using Claude AI reasoning for good examples analysis');
            const claudeAnalysis = await analyzeGoodExamplesWithClaude(documentContexts);
            
            const result = {
                examplesAnalyzed: files.length,
                averageScore: claudeAnalysis.assessmentInsights.averageScore,
                qualityIndicators: claudeAnalysis.qualityIndicators,
                writingPatterns: claudeAnalysis.excellencePatterns.slice(0, 5),
                commonStrengths: claudeAnalysis.successFactors.slice(0, 6),
                analysisMode: 'CLAUDE_AI_REASONING', // Clear indicator
                
                // Enhanced with Claude insights
                assessmentInsights: claudeAnalysis.assessmentInsights,
                analyses: documentContexts.map(doc => ({
                    filename: doc.filename,
                    sections: doc.extractedSections.length,
                    contentLength: doc.content.length
                }))
            };
            
            console.log(`✅ Claude good examples analysis complete: ${claudeAnalysis.qualityIndicators.length} indicators, score: ${claudeAnalysis.assessmentInsights.averageScore}`);
            return NextResponse.json(result);
            
        } catch (claudeError) {
            console.log('🤖 Claude good examples analysis failed, using basic analysis:', {
                error: claudeError instanceof Error ? claudeError.message : claudeError
            });
            // Fall through to basic analysis
        }
        
        // Basic analysis fallback
        console.log('📋 Using basic pattern matching for good examples analysis');
        const analyses = [];
        const allScores: number[] = [];
        const allPatterns: Set<string> = new Set();
        const allStrengths: Set<string> = new Set();
        
        for (const file of files) {
            try {
                console.log(`📊 Analyzing good example file: ${file.name}`);
                
                // Dynamic import to avoid potential production issues
                const { analyzeApplicationForm } = await import('@/utils/server-document-analyzer');
                console.log(`📊 Analyzer imported successfully`);
                
                const analysis = await analyzeApplicationForm(file);
                
                if (analysis) {
                    console.log(`✅ Analysis successful for ${file.name}:`, {
                        sections: analysis.sections?.length || 0,
                        wordCount: analysis.wordCount || 0,
                        questionsFound: analysis.questionsFound || 0,
                        extractedSectionsLength: analysis.extractedSections?.length || 0
                    });
                    analyses.push(analysis);
                    
                    // Extract quality metrics from the analysis
                    // Base score on document completeness and structure
                    try {
                        const score = calculateQualityScore(analysis);
                        console.log(`📊 Quality score for ${file.name}: ${score}`);
                        allScores.push(score);
                    } catch (scoreError) {
                        console.error(`❌ Error calculating quality score for ${file.name}:`, scoreError);
                        allScores.push(75); // Default score on error
                    }
                    
                    // Extract writing patterns
                    if (analysis.wordCount > 0) {
                        const avgWordsPerSection = Math.round(analysis.wordCount / (analysis.sections.length || 1));
                        allPatterns.add(`Average section length: ${avgWordsPerSection} words`);
                    }
                    
                    if (analysis.extractedSections?.length > 0) {
                        allPatterns.add(`Structured with ${analysis.extractedSections.length} clear sections`);
                    }
                    
                    // Extract common strengths based on content
                    if (analysis.questionsFound > 10) {
                        allStrengths.add('Comprehensive coverage of all required questions');
                    }
                    if (analysis.complexity === 'Complex') {
                        allStrengths.add('Detailed and thorough responses');
                    }
                    if (analysis.fieldTypes.length > 5) {
                        allStrengths.add('Rich variety of information types');
                    }
                    if (analysis.sections.some(s => s.toLowerCase().includes('budget'))) {
                        allStrengths.add('Detailed budget breakdowns');
                    }
                    if (analysis.sections.some(s => s.toLowerCase().includes('timeline') || s.toLowerCase().includes('milestone'))) {
                        allStrengths.add('Clear timelines and milestones');
                    }
                    if (analysis.sections.some(s => s.toLowerCase().includes('team') || s.toLowerCase().includes('experience'))) {
                        allStrengths.add('Strong team credentials');
                    }
                    if (analysis.sections.some(s => s.toLowerCase().includes('outcome') || s.toLowerCase().includes('impact'))) {
                        allStrengths.add('Measurable outcomes defined');
                    }
                } else {
                    console.warn(`❌ No analysis returned for ${file.name}`);
                }
            } catch (error) {
                console.error(`❌ Error analyzing file ${file.name}:`, {
                    error: error instanceof Error ? error.message : error,
                    stack: error instanceof Error ? error.stack : 'No stack trace'
                });
            }
        }
        
        // Calculate average score
        const averageScore = allScores.length > 0 
            ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
            : 75;
        
        // Generate quality indicators based on analysis
        const qualityIndicators: QualityIndicator[] = [
            {
                name: 'Document Completeness',
                score: Math.min(95, averageScore + 10),
                description: 'All required sections are thoroughly addressed'
            },
            {
                name: 'Answer Relevance',
                score: Math.min(92, averageScore + 5),
                description: 'Responses directly address the questions asked'
            },
            {
                name: 'Detail Level',
                score: averageScore,
                description: 'Appropriate amount of detail and evidence provided'
            },
            {
                name: 'Structure & Clarity',
                score: Math.min(90, averageScore + 3),
                description: 'Well-organized with clear sections and flow'
            }
        ];
        
        // Convert sets to arrays and add default patterns if needed
        let writingPatterns = Array.from(allPatterns);
        if (writingPatterns.length === 0) {
            writingPatterns = [
                'Clear and professional writing style',
                'Consistent formatting throughout',
                'Logical flow between sections'
            ];
        }
        
        let commonStrengths = Array.from(allStrengths);
        if (commonStrengths.length === 0) {
            commonStrengths = [
                'Clear problem identification',
                'Well-defined objectives',
                'Professional presentation'
            ];
        }
        
        const result = {
            examplesAnalyzed: files.length,
            averageScore,
            qualityIndicators,
            writingPatterns: writingPatterns.slice(0, 5), // Limit to top 5
            commonStrengths: commonStrengths.slice(0, 6), // Limit to top 6
            analysisMode: 'BASIC_FALLBACK', // Clear indicator
            analyses: analyses.map(a => ({
                sections: a.sections.length,
                wordCount: a.wordCount,
                complexity: a.complexity
            }))
        };
        
        console.log(`✅ Good examples analysis complete:`, {
            files: files.length,
            averageScore,
            patterns: writingPatterns.length,
            strengths: commonStrengths.length
        });
        
        return NextResponse.json(result);
        
    } catch (error) {
        console.error('❌ Error analyzing good examples:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            type: error instanceof Error ? error.constructor.name : typeof error
        });
        
        return NextResponse.json(
            { 
                error: 'Failed to analyze good examples',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

function calculateQualityScore(analysis: any): number {
    let score = 70; // Base score
    
    // Add points for completeness
    if (analysis.sections.length > 5) score += 5;
    if (analysis.sections.length > 10) score += 5;
    
    // Add points for detail
    if (analysis.wordCount > 1000) score += 5;
    if (analysis.wordCount > 2000) score += 5;
    
    // Add points for complexity
    if (analysis.complexity === 'Medium') score += 3;
    if (analysis.complexity === 'Complex') score += 7;
    
    // Add points for structure
    if (analysis.extractedSections?.length > 0) score += 5;
    
    return Math.min(95, score); // Cap at 95
}