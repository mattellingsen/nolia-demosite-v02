/**
 * AWS Credentials Provider - Forces IAM Role Usage in Production
 *
 * This utility ensures that AWS SDK clients ONLY use IAM role credentials in production,
 * completely bypassing SSO configuration files and expired tokens.
 *
 * Root Cause Fixed:
 * - AWS SDK credential provider chain checks ~/.aws/config and ~/.aws/sso/cache/
 * - These files may contain expired SSO tokens from the build environment
 * - By explicitly providing fromInstanceMetadata(), we force IAM role usage
 * - The SDK never checks configuration files when credentials are explicitly provided
 */

import { fromInstanceMetadata, fromEnv, fromContainerMetadata, fromNodeProviderChain } from '@aws-sdk/credential-providers';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';

/**
 * Get AWS credentials provider based on environment
 *
 * Production: Forces IAM role credentials via custom chain (bypasses SSO config files)
 * Development: Uses environment variables (from export-aws-creds.sh)
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
    // CRITICAL: Let AWS SDK use default credential chain for Amplify Lambda execution role
    // Amplify Next.js API routes run as Lambda functions with execution role credentials
    // The SDK's default chain correctly resolves Lambda execution role credentials
    // Previous approach using fromNodeProviderChain() didn't work in Amplify environment
    console.log('🔒 Using SDK default credential chain for Amplify Lambda (production mode)');
    console.log('🔒 DEBUG: Credential provider: undefined (SDK will auto-detect Lambda execution role)');

    return undefined; // Let SDK use default chain (includes Lambda execution role)
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
