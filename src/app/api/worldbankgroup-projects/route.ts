import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: List all worldbankgroup projects
export async function GET(req: NextRequest) {
  try {
    console.log('🔄 [WorldBankGroup Projects] API called at:', new Date().toISOString());

    // Fetch all projects
    const allProjects = await prisma.funds.findMany({
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
      }
    });

    // Separate PROCESSING and ACTIVE projects
    const processingProjects = allProjects.filter(p => p.status !== 'ACTIVE');
    const activeProjects = allProjects.filter(p => p.status === 'ACTIVE');

    // Sort PROCESSING by createdAt DESC (newest first)
    processingProjects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Sort ACTIVE by createdAt ASC (oldest first) - this will give us the custom order
    activeProjects.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Combine: PROCESSING first, then ACTIVE
    const projects = [...processingProjects, ...activeProjects];

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
