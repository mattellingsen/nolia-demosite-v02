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

import { fromInstanceMetadata, fromEnv } from '@aws-sdk/credential-providers';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';

/**
 * Get AWS credentials provider based on environment
 *
 * Production: Forces IAM role credentials (ignores all config files)
 * Development: Uses environment variables (from export-aws-creds.sh)
 */
export function getAWSCredentials(): AwsCredentialIdentityProvider | undefined {
  if (process.env.NODE_ENV === 'production') {
    // CRITICAL: Explicitly use IAM role credentials in production
    // This bypasses ALL configuration files and SSO settings
    console.log('🔒 Using IAM role credentials (production mode)');
    return fromInstanceMetadata({
      timeout: 1000,
      maxRetries: 3,
    });
  } else {
    // Development: Use environment variables from export-aws-creds.sh
    // Falls back to default credential chain if not set
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('🔧 Using environment variable credentials (development mode)');
      return fromEnv();
    }
    console.log('🔧 Using default credential chain (development mode)');
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
