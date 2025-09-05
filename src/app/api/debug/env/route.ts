// Debug endpoint to check environment variables
import { NextResponse } from 'next/server';

export async function GET() {
  // Show limited debug info in production
  const isProduction = process.env.NODE_ENV === 'production';

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasOpensearchEndpoint: Boolean(process.env.OPENSEARCH_ENDPOINT),
    hasOpensearchUsername: Boolean(process.env.OPENSEARCH_USERNAME),
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
    hasAdminKey: Boolean(process.env.ADMIN_API_KEY),
    hasNoliaRegion: Boolean(process.env.NOLIA_AWS_REGION),
    hasNoliaAccessKey: Boolean(process.env.NOLIA_AWS_ACCESS_KEY_ID),
    hasRegularRegion: Boolean(process.env.AWS_REGION),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    // Only show env keys in development for security
    availableEnvKeys: isProduction ? ['HIDDEN_IN_PRODUCTION'] : Object.keys(process.env).filter(key => 
      key.includes('OPENSEARCH') || 
      key.includes('OPENAI') || 
      key.includes('ADMIN') ||
      key.includes('NOLIA') ||
      key.includes('AWS') ||
      key.includes('DATABASE')
    ),
  });
}