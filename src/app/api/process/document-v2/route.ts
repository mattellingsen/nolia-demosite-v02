import { NextRequest, NextResponse } from 'next/server';
import { analyzeApplicationForm } from '@/utils/server-document-analyzer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, Word, Excel, or text files only.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB.' },
        { status: 400 }
      );
    }

    // Use pattern matching for immediate feedback (fast response)
    console.log('📋 V2: Using pattern matching analysis for immediate feedback');
    const analysis = await analyzeApplicationForm(file);
    analysis.analysisMode = 'PATTERN_MATCHING_V2';
    analysis.transparencyInfo = {
      analysisMethod: 'Pattern Matching',
      aiUsed: false,
      userMessage: '📋 Document analyzed using pattern-based analysis (fast preview)'
    };
    console.log('✅ V2: Pattern matching analysis complete for immediate feedback');

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error analyzing document V2:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}