/**
 * Force AWS SDK to use IAM roles in production by clearing all SSO/credential env vars
 * This prevents the SDK from trying to use SSO profiles that may exist in the build environment
 */
export function forceIAMRole() {
  if (process.env.NODE_ENV === 'production') {
    // Clear all AWS credential-related environment variables that could cause SSO usage
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_SDK_LOAD_CONFIG;
    delete process.env.AWS_CONFIG_FILE;
    delete process.env.AWS_SHARED_CREDENTIALS_FILE;

    // Set this to explicitly disable config file loading
    process.env.AWS_SDK_LOAD_CONFIG = '0';

    console.log('🔒 Forced IAM role usage in production (cleared SSO env vars)');
  }
}
