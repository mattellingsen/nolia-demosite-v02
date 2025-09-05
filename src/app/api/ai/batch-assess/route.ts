// Batch application assessment API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { batchAssessApplications } from '@/lib/rag-database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applications, fundId } = body;
    
    if (!applications || !Array.isArray(applications) || !fundId) {
      return NextResponse.json(
        { error: 'Applications array and fund ID are required' },
        { status: 400 }
      );
    }
    
    if (applications.length === 0) {
      return NextResponse.json(
        { error: 'At least one application is required' },
        { status: 400 }
      );
    }
    
    if (applications.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 applications per batch' },
        { status: 400 }
      );
    }
    
    // Validate application format
    for (const app of applications) {
      if (!app.id || !app.text) {
        return NextResponse.json(
          { error: 'Each application must have id and text fields' },
          { status: 400 }
        );
      }
    }
    
    // Perform batch assessment
    const results = await batchAssessApplications(applications, fundId);
    
    // Calculate summary statistics
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    const averageScore = successful.length > 0 
      ? successful.reduce((sum, r) => sum + (r.assessment?.score || 0), 0) / successful.length
      : 0;
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: applications.length,
        successful: successful.length,
        failed: failed.length,
        averageScore: Math.round(averageScore * 10) / 10,
        processedAt: new Date().toISOString(),
      }
    });
    
  } catch (error) {
    console.error('Batch assessment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to assess applications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}