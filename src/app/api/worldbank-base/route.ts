import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: List all worldbank bases
export async function GET(req: NextRequest) {
  try {
    // Force cache refresh - deployment timestamp
    console.log('🔄 API called at:', new Date().toISOString());
    const bases = await prisma.fund.findMany({
      where: {
        moduleType: 'WORLDBANK_ADMIN'
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        moduleType: true,
        createdAt: true,
        updatedAt: true,
        brainAssembledAt: true,
        brainVersion: true,
        documents: {
          select: {
            id: true,
            documentType: true,
            filename: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform to match expected interface
    const transformedBases = bases.map(base => ({
      id: base.id,
      name: base.name,
      description: base.description,
      status: base.status,
      createdAt: base.createdAt.toISOString(),
      updatedAt: base.updatedAt.toISOString(),
      documentsCount: base.documents.length,
      brainAssembledAt: base.brainAssembledAt?.toISOString(),
      brainVersion: base.brainVersion
    }));

    return NextResponse.json({
      success: true,
      bases: transformedBases
    });
  } catch (error) {
    console.error('Error fetching worldbank bases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worldbank bases' },
      { status: 500 }
    );
  }
}

// POST: Create a new worldbank base
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name) {
      return NextResponse.json(
        { error: 'Base name is required' },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existingBase = await prisma.fund.findFirst({
      where: {
        name: name.trim(),
        moduleType: 'WORLDBANK_ADMIN'
      }
    });

    if (existingBase) {
      return NextResponse.json(
        { error: 'A worldbank base with this name already exists' },
        { status: 409 }
      );
    }

    // Create the worldbank base
    const base = await prisma.fund.create({
      data: {
        name: name.trim(),
        description: description || null,
        status: 'DRAFT',
        moduleType: 'WORLDBANK_ADMIN',
        brainVersion: 1
      }
    });

    return NextResponse.json({
      success: true,
      base: {
        id: base.id,
        name: base.name,
        description: base.description,
        status: base.status,
        createdAt: base.createdAt.toISOString(),
        updatedAt: base.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating worldbank base:', error);
    return NextResponse.json(
      { error: 'Failed to create worldbank base' },
      { status: 500 }
    );
  }
}
