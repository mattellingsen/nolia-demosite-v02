import { NextResponse } from 'next/server';
import { backgroundProcessor } from '@/lib/background-processor';

/**
 * API endpoint to initialize background services
 * This is called automatically when the app starts
 */
export async function GET() {
  try {
    // Ensure background processor is started
    if (!backgroundProcessor.getStatus().running) {
      backgroundProcessor.start(30000); // Check every 30 seconds
      console.log('🚀 Background processor auto-started via /api/init');
    }

    return NextResponse.json({
      success: true,
      message: 'Background services initialized',
      backgroundProcessor: backgroundProcessor.getStatus()
    });
  } catch (error) {
    console.error('Failed to initialize background services:', error);
    return NextResponse.json({
      error: 'Failed to initialize background services'
    }, { status: 500 });
  }
}