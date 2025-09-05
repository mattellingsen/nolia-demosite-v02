// RAG system health check endpoint
import { NextResponse } from 'next/server';
import { ragHealthCheck, getRAGConfig } from '@/lib/rag-initialization';

export async function GET() {
  try {
    const [healthStatus, config] = await Promise.all([
      ragHealthCheck(),
      Promise.resolve(getRAGConfig()),
    ]);
    
    return NextResponse.json({
      ...healthStatus,
      config: {
        enabled: config.enabled,
        services: {
          opensearch: {
            configured: Boolean(config.services.opensearch.endpoint),
            endpoint: config.services.opensearch.endpoint ? '[CONFIGURED]' : '[NOT_CONFIGURED]',
          },
          bedrock: {
            region: config.services.bedrock.region,
            model: config.services.bedrock.model,
          },
          embeddings: {
            provider: config.services.embeddings.provider,
            model: config.services.embeddings.model,
          },
        },
      },
    });
    
  } catch (error) {
    console.error('RAG health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        services: {
          database: 'down',
          opensearch: 'down',
          bedrock: 'down',
          embeddings: 'down',
        },
      },
      { status: 500 }
    );
  }
}