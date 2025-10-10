/**
 * AWS Credentials Provider - Forces Lambda Execution Role in Production
 *
 * This utility ensures AWS SDK clients use Lambda execution role credentials,
 * bypassing expired Amplify build credentials that pollute the environment.
 *
 * ROOT CAUSE:
 * - Amplify sets AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN during build
 * - These are Amplify's BUILD-TIME credentials (for npm install, asset uploads, etc.)
 * - These credentials are EXPIRED at Lambda runtime but persist in environment
 * - AWS SDK default chain checks environment variables FIRST, finds expired creds, fails
 *
 * SOLUTION:
 * - Use fromContainerMetadata() explicitly to access Lambda execution role
 * - This bypasses environment variable check entirely
 * - Lambda provides credentials via AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
 * - This is the standard mechanism for ECS/Lambda containerized environments
 */

import { fromContainerMetadata, fromEnv } from '@aws-sdk/credential-providers';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';

/**
 * Get AWS credentials provider based on environment
 *
 * Production: Uses fromContainerMetadata() to access Lambda execution role directly
 * Development: Uses environment variables (from export-aws-creds.sh) or default chain
 */
export function getAWSCredentials(): AwsCredentialIdentityProvider | undefined {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 DEBUG: getAWSCredentials() called');
  console.log('🔐 DEBUG: NODE_ENV:', process.env.NODE_ENV);
  console.log('🔐 DEBUG: AWS_ACCESS_KEY_ID present:', !!process.env.AWS_ACCESS_KEY_ID);
  console.log('🔐 DEBUG: AWS_SECRET_ACCESS_KEY present:', !!process.env.AWS_SECRET_ACCESS_KEY);
  console.log('🔐 DEBUG: AWS_SESSION_TOKEN present:', !!process.env.AWS_SESSION_TOKEN);
  console.log('🔐 DEBUG: AWS_CONTAINER_CREDENTIALS_RELATIVE_URI present:', !!process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI);

  if (process.env.NODE_ENV === 'production') {
    // AMPLIFY FIX: Use container metadata directly to bypass expired build credentials
    // Lambda provides credentials via AWS_CONTAINER_CREDENTIALS_RELATIVE_URI environment variable
    // This points to an in-container endpoint that returns Lambda execution role credentials
    // By using fromContainerMetadata() explicitly, we skip environment variable checks
    // and go straight to the correct credential source for Lambda
    console.log('🔒 Using fromContainerMetadata() for Lambda execution role (bypassing Amplify build creds)');

    return fromContainerMetadata({
      timeout: 1000,  // 1 second timeout for credential fetch
      maxRetries: 2   // Retry twice if container metadata service is slow
    });
  } else {
    // Development: Use environment variables from export-aws-creds.sh
    // Falls back to default credential chain if not set (includes SSO)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('🔧 Using fromEnv() credentials (development mode)');
      console.log('🔧 DEBUG: Credential provider: fromEnv()');
      return fromEnv();
    }
    console.log('🔧 Using default credential chain (development mode - includes SSO)');
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
