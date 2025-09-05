// Debug endpoint to check environment variables
import { NextResponse } from 'next/server';

export async function GET() {
  // Only show this in development for security
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasOpensearchEndpoint: Boolean(process.env.OPENSEARCH_ENDPOINT),
    hasOpensearchUsername: Boolean(process.env.OPENSEARCH_USERNAME),
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
    hasAdminKey: Boolean(process.env.ADMIN_API_KEY),
    hasNoliaRegion: Boolean(process.env.NOLIA_AWS_REGION),
    hasNoliaAccessKey: Boolean(process.env.NOLIA_AWS_ACCESS_KEY_ID),
    hasRegularRegion: Boolean(process.env.AWS_REGION),
    availableEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('OPENSEARCH') || 
      key.includes('OPENAI') || 
      key.includes('ADMIN') ||
      key.includes('NOLIA') ||
      key.includes('AWS')
    ),
  });
}