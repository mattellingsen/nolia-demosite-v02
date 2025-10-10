/**
 * AWS Credentials Provider - Forces IAM Role Usage in Production
 *
 * This utility ensures that AWS SDK clients ONLY use IAM role credentials in production,
 * completely bypassing expired build credentials set by Amplify.
 *
 * Root Cause Fixed:
 * - Amplify sets expired build credentials in environment variables during deployment
 * - AWS SDK credential provider chain checks environment variables FIRST
 * - By deleting these env vars, we force SDK to use Lambda execution role
 * - The SDK's default chain correctly finds Lambda role via container metadata service
 */

import { fromEnv } from '@aws-sdk/credential-providers';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';

/**
 * Get AWS credentials provider based on environment
 *
 * Production: Cleans polluted env vars, lets SDK use Lambda execution role
 * Development: Uses environment variables (from export-aws-creds.sh) or SSO
 */
export function getAWSCredentials(): AwsCredentialIdentityProvider | undefined {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 DEBUG: getAWSCredentials() called');
  console.log('🔐 DEBUG: NODE_ENV:', process.env.NODE_ENV);
  console.log('🔐 DEBUG: AWS_ACCESS_KEY_ID present:', !!process.env.AWS_ACCESS_KEY_ID);
  console.log('🔐 DEBUG: AWS_SECRET_ACCESS_KEY present:', !!process.env.AWS_SECRET_ACCESS_KEY);
  console.log('🔐 DEBUG: AWS_SESSION_TOKEN present:', !!process.env.AWS_SESSION_TOKEN);
  console.log('🔐 DEBUG: AWS_PROFILE present:', !!process.env.AWS_PROFILE);

  if (process.env.NODE_ENV === 'production') {
    // CRITICAL FIX: Delete Amplify's expired build credentials from environment
    // These polluted env vars cause "The provided token has expired" errors
    // AWS SDK checks env vars FIRST in its credential chain
    if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SESSION_TOKEN) {
      console.log('🧹 Cleaning up Amplify build credentials from environment...');
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_SESSION_TOKEN;
      delete process.env.AWS_PROFILE;
      console.log('✅ Environment cleaned - SDK will now use Lambda execution role');
    }

    // Return undefined to let SDK use default chain
    // With env vars deleted, SDK will find Lambda execution role via container metadata
    // This is the correct approach for Amplify Lambda functions
    console.log('🔒 Using SDK default chain for Lambda execution role (production)');
    return undefined;
  } else {
    // Development: Use environment variables from export-aws-creds.sh
    // Falls back to default credential chain if not set
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('🔧 Using environment variable credentials (development mode)');
      console.log('🔧 DEBUG: Credential provider: fromEnv()');
      return fromEnv();
    }
    console.log('🔧 Using default credential chain (development mode)');
    console.log('🔧 DEBUG: Credential provider: undefined (SDK default chain)');
    return undefined; // Let SDK use default chain (includes SSO)
  }
}

/**
 * Standard AWS region configuration
 */
export const AWS_REGION = process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2';

/**
 * Standard S3 bucket name
 */
export const S3_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'nolia-funding-documents-ap-southeast-2-599065966827';
