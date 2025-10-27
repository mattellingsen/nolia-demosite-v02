// Next.js instrumentation hook - runs ONCE at server startup
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // This runs server-side only, once when the Next.js server starts
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 INSTRUMENTATION: Server starting, initializing background services...');

    // Import and start background processor
    const { backgroundProcessor } = await import('./src/lib/background-processor');

    // Check environment and start if appropriate
    const isActualLambda = process.env.AWS_BRANCH && process.env.AWS_EXECUTION_ENV;
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && !isActualLambda) {
      console.log('🚀 INSTRUMENTATION: Production environment detected (non-Lambda), starting background processor...');
    } else if (process.env.NODE_ENV === 'development') {
      console.log('🚀 INSTRUMENTATION: Development environment detected, starting background processor...');
    }

    // Small delay to ensure database is ready, then start
    setTimeout(() => {
      if (!backgroundProcessor.getStatus().running) {
        backgroundProcessor.start(30000); // Check every 30 seconds
        console.log('✅ INSTRUMENTATION: Background processor started successfully');
      } else {
        console.log('✅ INSTRUMENTATION: Background processor already running');
      }
    }, 2000); // 2 second delay
  }
}
