import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

/**
 * Check if a fund name is already taken
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');

    if (!name || !name.trim()) {
      return NextResponse.json({
        available: false,
        error: 'Fund name is required'
      }, { status: 400 });
    }

    // Check if a fund with this name already exists
    const existingFund = await prisma.fund.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive' // Case-insensitive comparison
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (existingFund) {
      return NextResponse.json({
        available: false,
        message: `A fund named "${existingFund.name}" already exists. Please choose a different name.`
      });
    }

    return NextResponse.json({
      available: true,
      message: 'This name is available'
    });

  } catch (error) {
    console.error('Error checking fund name:', error);
    return NextResponse.json({
      available: false,
      error: 'Failed to check fund name availability'
    }, { status: 500 });
  }
}