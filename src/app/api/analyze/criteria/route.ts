import { NextRequest, NextResponse } from 'next/server';
import { analyzeSelectionCriteria } from '@/utils/server-document-analyzer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract multiple files
    const files: File[] = [];
    let index = 0;
    
    while (formData.get(`files[${index}]`)) {
      const file = formData.get(`files[${index}]`) as File;
      files.push(file);
      index++;
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: 'Some files are not supported. Please upload PDF, Word, Excel, or text files only.' },
        { status: 400 }
      );
    }

    // Validate file sizes (10MB limit each)
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      return NextResponse.json(
        { error: 'Some files exceed 10MB limit. Please reduce file sizes.' },
        { status: 400 }
      );
    }

    // Perform real criteria analysis using server-side libraries
    const analysis = await analyzeSelectionCriteria(files);

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error analyzing criteria:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze selection criteria',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}