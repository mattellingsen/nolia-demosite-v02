import { NextRequest, NextResponse } from 'next/server';
import { analyzeApplicationForm, analyzeSelectionCriteria } from '@/utils/server-document-analyzer';

export async function POST(request: NextRequest) {
  const timings: any[] = [];
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    
    // Time application form processing
    const applicationFormFile = formData.get('applicationForm') as File | null;
    if (applicationFormFile) {
      const appFormStart = Date.now();
      try {
        const analysis = await analyzeApplicationForm(applicationFormFile);
        timings.push({
          step: 'Application Form Analysis',
          filename: applicationFormFile.name,
          fileSize: applicationFormFile.size,
          duration: Date.now() - appFormStart,
          status: 'success',
          wordCount: analysis.wordCount
        });
      } catch (error) {
        timings.push({
          step: 'Application Form Analysis',
          filename: applicationFormFile.name,
          fileSize: applicationFormFile.size,
          duration: Date.now() - appFormStart,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Time selection criteria processing
    const selectionCriteriaFiles: File[] = [];
    let index = 0;
    while (formData.get(`selectionCriteria[${index}]`)) {
      const file = formData.get(`selectionCriteria[${index}]`) as File;
      selectionCriteriaFiles.push(file);
      index++;
    }
    
    if (selectionCriteriaFiles.length > 0) {
      const selectionStart = Date.now();
      try {
        const analysis = await analyzeSelectionCriteria(selectionCriteriaFiles);
        timings.push({
          step: 'Selection Criteria Analysis',
          fileCount: selectionCriteriaFiles.length,
          totalSize: selectionCriteriaFiles.reduce((sum, f) => sum + f.size, 0),
          duration: Date.now() - selectionStart,
          status: 'success'
        });
      } catch (error) {
        timings.push({
          step: 'Selection Criteria Analysis',
          fileCount: selectionCriteriaFiles.length,
          duration: Date.now() - selectionStart,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Time good examples processing
    const goodExamplesFiles: File[] = [];
    index = 0;
    while (formData.get(`goodExamples[${index}]`)) {
      const file = formData.get(`goodExamples[${index}]`) as File;
      goodExamplesFiles.push(file);
      index++;
    }
    
    if (goodExamplesFiles.length > 0) {
      const goodExamplesStart = Date.now();
      try {
        const analysis = await analyzeSelectionCriteria(goodExamplesFiles);
        timings.push({
          step: 'Good Examples Analysis',
          fileCount: goodExamplesFiles.length,
          totalSize: goodExamplesFiles.reduce((sum, f) => sum + f.size, 0),
          duration: Date.now() - goodExamplesStart,
          status: 'success'
        });
      } catch (error) {
        timings.push({
          step: 'Good Examples Analysis',
          fileCount: goodExamplesFiles.length,
          duration: Date.now() - goodExamplesStart,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      totalDuration,
      timings,
      summary: {
        totalFiles: 1 + selectionCriteriaFiles.length + goodExamplesFiles.length,
        totalProcessingTime: totalDuration,
        averagePerFile: Math.round(totalDuration / (1 + selectionCriteriaFiles.length + goodExamplesFiles.length))
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalDuration: Date.now() - startTime,
      timings
    }, { status: 500 });
  }
}