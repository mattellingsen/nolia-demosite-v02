import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

/**
 * Check if a project name is already taken
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');

    if (!name || !name.trim()) {
      return NextResponse.json({
        available: false,
        error: 'Project name is required'
      }, { status: 400 });
    }

    // Check if a project with this name already exists (WORLDBANK module)
    const existingProject = await prisma.funds.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive' // Case-insensitive comparison
        },
        moduleType: 'WORLDBANK' // Critical: Only check WORLDBANK projects
      },
      select: {
        id: true,
        name: true
      }
    });

    if (existingProject) {
      return NextResponse.json({
        available: false,
        message: `A project named "${existingProject.name}" already exists. Please choose a different name.`
      });
    }

    return NextResponse.json({
      available: true,
      message: 'This name is available'
    });

  } catch (error) {
    console.error('Error checking project name:', error);
    return NextResponse.json({
      available: false,
      error: 'Failed to check project name availability'
    }, { status: 500 });
  }
}
