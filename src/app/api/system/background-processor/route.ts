import { NextRequest, NextResponse } from 'next/server';
import { backgroundProcessor } from '@/lib/background-processor';

/**
 * Background processor control endpoint
 * GET: Check status
 * POST: Start/stop processor
 */

export async function GET() {
  try {
    const status = backgroundProcessor.getStatus();

    return NextResponse.json({
      success: true,
      status,
      message: status.running ? 'Background processor is running' : 'Background processor is stopped'
    });
  } catch (error) {
    console.error('Error getting background processor status:', error);
    return NextResponse.json({
      error: 'Failed to get processor status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, intervalMs } = await request.json();

    if (action === 'start') {
      backgroundProcessor.start(intervalMs || 30000);
      return NextResponse.json({
        success: true,
        message: 'Background processor started',
        status: backgroundProcessor.getStatus()
      });
    } else if (action === 'stop') {
      backgroundProcessor.stop();
      return NextResponse.json({
        success: true,
        message: 'Background processor stopped',
        status: backgroundProcessor.getStatus()
      });
    } else if (action === 'restart') {
      backgroundProcessor.stop();
      backgroundProcessor.start(intervalMs || 30000);
      return NextResponse.json({
        success: true,
        message: 'Background processor restarted',
        status: backgroundProcessor.getStatus()
      });
    } else {
      return NextResponse.json({
        error: 'Invalid action. Use: start, stop, or restart'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error controlling background processor:', error);
    return NextResponse.json({
      error: 'Failed to control processor'
    }, { status: 500 });
  }
}