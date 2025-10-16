import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

/**
 * Check if a tender name is already taken
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');

    if (!name || !name.trim()) {
      return NextResponse.json({
        available: false,
        error: 'Tender name is required'
      }, { status: 400 });
    }

    // Check if a tender with this name already exists (PROCUREMENT module)
    const existingTender = await prisma.funds.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive' // Case-insensitive comparison
        },
        moduleType: 'PROCUREMENT' // Critical: Only check PROCUREMENT tenders
      },
      select: {
        id: true,
        name: true
      }
    });

    if (existingTender) {
      return NextResponse.json({
        available: false,
        message: `A tender named "${existingTender.name}" already exists. Please choose a different name.`
      });
    }

    return NextResponse.json({
      available: true,
      message: 'This name is available'
    });

  } catch (error) {
    console.error('Error checking tender name:', error);
    return NextResponse.json({
      available: false,
      error: 'Failed to check tender name availability'
    }, { status: 500 });
  }
}
