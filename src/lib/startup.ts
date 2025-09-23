// Application startup initialization
// This ensures critical services start when the app loads

import { backgroundProcessor } from './background-processor';

let initialized = false;

/**
 * Initialize background services
 * Called automatically when this module is imported
 */
function initializeServices() {
  if (initialized) return;

  console.log('🚀 Initializing application services...');

  try {
    // Start background processor if not already running
    if (!backgroundProcessor.getStatus().running) {
      backgroundProcessor.start(30000); // Check every 30 seconds
      console.log('✅ Background processor started automatically');
    } else {
      console.log('✅ Background processor already running');
    }

    initialized = true;
    console.log('🎉 Application services initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize application services:', error);
  }
}

// Auto-initialize when this module is imported
if (process.env.NODE_ENV === 'development') {
  // Add a delay to ensure the database is ready
  setTimeout(initializeServices, 2000);
} else {
  // In production, initialize immediately
  initializeServices();
}

export { initializeServices };