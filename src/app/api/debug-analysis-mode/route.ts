import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        console.log('🔍 Debug Analysis Mode Test');
        
        const formData = await request.formData();
        const files: any[] = [];
        
        // Collect files
        for (const [key, value] of formData.entries()) {
            if (value && typeof value === 'object' && 'name' in value && 'size' in value) {
                files.push(value);
            }
        }
        
        if (files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }
        
        // Test which analysis mode is being used
        const { analyzeSelectionCriteria } = await import('@/utils/server-document-analyzer');
        
        console.log('🔍 Testing criteria analysis mode...');
        const result = await analyzeSelectionCriteria(files);
        
        const analysisMode = result.analysisMode || 'UNKNOWN';
        console.log(`🔍 Analysis mode detected: ${analysisMode}`);
        
        return NextResponse.json({
            analysisMode,
            speed: analysisMode === 'CLAUDE_AI_REASONING' ? 'SLOW (10-15s)' : 'FAST (1-2s)',
            quality: analysisMode === 'CLAUDE_AI_REASONING' ? 'HIGH (AI Reasoning)' : 'BASIC (Pattern Matching)',
            hasAiReasoning: !!result.aiReasoning,
            criteriaCount: result.detectedCriteria?.length || 0,
            debug: {
                extractedSections: result.extractedSections?.length || 0,
                categories: result.categories?.length || 0,
                weightings: result.weightings?.length || 0
            }
        });
        
    } catch (error) {
        console.error('Debug analysis error:', error);
        return NextResponse.json({
            error: 'Debug test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}