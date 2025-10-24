import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: List all worldbankgroup bases
export async function GET(req: NextRequest) {
  try {
    console.log('🔄 [WorldBankGroup] API called at:', new Date().toISOString());
    const bases = await prisma.funds.findMany({
      where: {
        moduleType: 'WORLDBANKGROUP_ADMIN'
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
        fund_documents: {
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
    const transformedBases = bases.map(base => {
      // SPECIAL CASE: This specific baseId shows as ACTIVE (completed)
      const isCompletedDemo = base.id === '789befa3-1df7-4a40-a101-a36e3cdfaf0d';

      return {
        id: base.id,
        name: base.name,
        description: base.description,
        status: isCompletedDemo ? 'ACTIVE' : base.status,
        createdAt: base.createdAt.toISOString(),
        updatedAt: base.updatedAt.toISOString(),
        documentsCount: base.fund_documents.length,
        brainAssembledAt: base.brainAssembledAt?.toISOString(),
        brainVersion: base.brainVersion
      };
    });

    return NextResponse.json({
      success: true,
      bases: transformedBases,
      fakeDemo: true
    });
  } catch (error) {
    console.error('[WorldBankGroup] Error fetching bases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WorldBankGroup bases' },
      { status: 500 }
    );
  }
}

// POST: Create a new worldbankgroup base
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
    const existingBase = await prisma.funds.findFirst({
      where: {
        name: name.trim(),
        moduleType: 'WORLDBANKGROUP_ADMIN'
      }
    });

    if (existingBase) {
      return NextResponse.json(
        { error: 'A WorldBankGroup base with this name already exists' },
        { status: 409 }
      );
    }

    // Create the worldbankgroup base
    const base = await prisma.funds.create({
      data: {
        name: name.trim(),
        description: description || null,
        status: 'DRAFT',
        moduleType: 'WORLDBANKGROUP_ADMIN',
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
      },
      fakeDemo: true
    });
  } catch (error) {
    console.error('[WorldBankGroup] Error creating base:', error);
    return NextResponse.json(
      { error: 'Failed to create WorldBankGroup base' },
      { status: 500 }
    );
  }
}
