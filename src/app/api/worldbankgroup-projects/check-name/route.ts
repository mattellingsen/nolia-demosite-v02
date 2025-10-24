import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Check if worldbankgroup project name is available
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name parameter is required' },
        { status: 400 }
      );
    }

    const existingProject = await prisma.funds.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        },
        moduleType: 'WORLDBANKGROUP'
      },
      select: {
        id: true,
        name: true
      }
    });

    const isAvailable = !existingProject;

    return NextResponse.json({
      available: isAvailable,
      name: name.trim(),
      message: isAvailable
        ? 'This name is available'
        : 'A WorldBankGroup project with this name already exists'
    });

  } catch (error) {
    console.error('[WorldBankGroup Projects] Error checking name availability:', error);
    return NextResponse.json(
      { error: 'Failed to check name availability' },
      { status: 500 }
    );
  }
}
