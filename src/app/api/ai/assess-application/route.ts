// RAG-powered application assessment API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { assessApplicationWithRAG, getApplicationGuidance } from '@/lib/rag-database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationText, fundId, assessmentType = 'scoring' } = body;
    
    if (!applicationText || !fundId) {
      return NextResponse.json(
        { error: 'Application text and fund ID are required' },
        { status: 400 }
      );
    }
    
    // Perform RAG-powered assessment
    const assessment = await assessApplicationWithRAG(
      applicationText,
      fundId,
      assessmentType
    );
    
    return NextResponse.json({
      success: true,
      assessment: {
        score: assessment.score,
        eligible: assessment.eligible,
        feedback: assessment.feedback,
        recommendations: assessment.recommendations,
        criteriaMatch: assessment.criteriaMatch,
        timestamp: new Date().toISOString(),
      }
    });
    
  } catch (error) {
    console.error('AI assessment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to assess application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for getting guidance on application improvement
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationText = searchParams.get('applicationText');
    const fundId = searchParams.get('fundId');
    
    if (!applicationText || !fundId) {
      return NextResponse.json(
        { error: 'Application text and fund ID are required' },
        { status: 400 }
      );
    }
    
    // Get AI guidance for improvement
    const guidance = await getApplicationGuidance(applicationText, fundId);
    
    return NextResponse.json({
      success: true,
      guidance: {
        feedback: guidance.feedback,
        recommendations: guidance.recommendations,
        criteriaMatch: guidance.criteriaMatch,
        timestamp: new Date().toISOString(),
      }
    });
    
  } catch (error) {
    console.error('AI guidance error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get application guidance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}