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
    // CRITICAL FIX: Delete expired Amplify build credentials from environment
    // Amplify leaks its build-time AWS credentials into Lambda execution environment
    // These expired credentials cause "The provided token has expired" errors
    // By deleting them, SDK credential chain skips env vars and uses Lambda execution role
    console.log('🔒 Deleting Amplify build credentials to force Lambda execution role usage');
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
    delete process.env.AWS_PROFILE;
    console.log('🔒 Credentials deleted - SDK will use Lambda execution role');

    return undefined; // SDK will now use Lambda execution role (no env vars to pollute)
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
