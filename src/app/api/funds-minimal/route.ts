import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || undefined;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Fund name is required' },
        { status: 400 }
      );
    }

    console.log(`Creating minimal fund: ${name}`);
    const startTime = Date.now();

    // Create just the fund record - no files, no processing
    const fund = await prisma.fund.create({
      data: {
        name,
        description,
        status: 'ACTIVE'
      }
    });

    const duration = Date.now() - startTime;
    console.log(`Minimal fund created in ${duration}ms`);

    return NextResponse.json({
      success: true,
      fund: {
        id: fund.id,
        name: fund.name,
        description: fund.description,
        status: fund.status,
        createdAt: fund.createdAt,
      },
      processing: {
        filesSkipped: true,
        ragSkipped: true,
        documentAnalysisSkipped: true
      },
      performance: {
        duration: `${duration}ms`,
        message: 'Minimal fund creation - no file processing'
      }
    });

  } catch (error) {
    console.error('Error creating minimal fund:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create fund',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}