import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    
    // Collect all files and their info
    const fileInfo: Array<{
      name: string;
      size: number;
      type: string;
      key: string;
    }> = [];
    
    let totalSize = 0;
    
    // Check all possible file fields
    const fileFields = [
      'applicationForm',
      ...Array.from({ length: 10 }, (_, i) => `selectionCriteria[${i}]`),
      ...Array.from({ length: 10 }, (_, i) => `goodExamples[${i}]`)
    ];
    
    for (const field of fileFields) {
      const file = formData.get(field) as File | null;
      if (file) {
        const info = {
          name: file.name,
          size: file.size,
          type: file.type,
          key: field
        };
        fileInfo.push(info);
        totalSize += file.size;
      }
    }
    
    // Test base64 conversion for size estimation
    let base64TotalSize = 0;
    const conversionResults: any[] = [];
    
    for (const file of fileInfo) {
      const actualFile = formData.get(file.key) as File;
      const buffer = await actualFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      
      conversionResults.push({
        filename: file.name,
        originalSize: file.size,
        base64Size: base64.length,
        compressionRatio: (base64.length / file.size).toFixed(2)
      });
      
      base64TotalSize += base64.length;
    }
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      summary: {
        totalFiles: fileInfo.length,
        totalOriginalSize: totalSize,
        totalBase64Size: base64TotalSize,
        processingTime: `${duration}ms`
      },
      files: fileInfo,
      conversions: conversionResults,
      limits: {
        awsLambdaPayloadLimit: '6MB',
        exceedsLimit: base64TotalSize > 6 * 1024 * 1024,
        recommendedMaxSize: '4MB total'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}