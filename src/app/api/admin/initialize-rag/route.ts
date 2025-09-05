// RAG system initialization endpoint (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { initializeRAGSystem } from '@/lib/rag-initialization';

export async function POST(request: NextRequest) {
  try {
    // Simple admin check - in production, use proper auth
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY;
    
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('🚀 Initializing RAG system...');
    const result = await initializeRAGSystem();
    
    if (result.success) {
      console.log('✅ RAG system initialization completed successfully');
      return NextResponse.json({
        success: true,
        message: 'RAG system initialized successfully',
        components: result.components,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('⚠️ RAG system initialization completed with errors');
      return NextResponse.json({
        success: false,
        message: 'RAG system initialization completed with errors',
        components: result.components,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      }, { status: 207 }); // Multi-status
    }
    
  } catch (error) {
    console.error('❌ RAG system initialization failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'RAG system initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}