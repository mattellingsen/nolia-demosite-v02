import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: List all worldbankgroup projects
export async function GET(req: NextRequest) {
  try {
    console.log('🔄 [WorldBankGroup Projects] API called at:', new Date().toISOString());
    const projects = await prisma.funds.findMany({
      where: {
        moduleType: 'WORLDBANKGROUP'
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

    const transformedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      documentsCount: project.fund_documents.length,
      brainAssembledAt: project.brainAssembledAt?.toISOString(),
      brainVersion: project.brainVersion
    }));

    return NextResponse.json({
      success: true,
      projects: transformedProjects,
      fakeDemo: true
    });
  } catch (error) {
    console.error('[WorldBankGroup Projects] Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WorldBankGroup projects' },
      { status: 500 }
    );
  }
}
