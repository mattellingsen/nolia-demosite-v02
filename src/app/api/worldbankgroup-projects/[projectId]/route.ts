import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Get a specific worldbankgroup project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const project = await prisma.funds.findFirst({
      where: {
        id: projectId,
        moduleType: 'WORLDBANKGROUP'
      },
      include: {
        fund_documents: {
          select: {
            id: true,
            documentType: true,
            filename: true,
            fileSize: true,
            uploadedAt: true
          }
        },
        background_jobs: {
          select: {
            id: true,
            type: true,
            status: true,
            progress: true,
            totalDocuments: true,
            processedDocuments: true,
            errorMessage: true,
            createdAt: true,
            completedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'WorldBankGroup project not found' },
        { status: 404 }
      );
    }

    const transformedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      brainAssembledAt: project.brainAssembledAt?.toISOString(),
      brainVersion: project.brainVersion,
      documentsCount: project.fund_documents.length,
      documents: project.fund_documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        filename: doc.filename,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt.toISOString()
      })),
      background_jobs: project.background_jobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        totalDocuments: job.totalDocuments,
        processedDocuments: job.processedDocuments,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString()
      }))
    };

    return NextResponse.json({
      success: true,
      project: transformedProject
    });
  } catch (error) {
    console.error('[WorldBankGroup Projects] Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WorldBankGroup project' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a worldbankgroup project
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const project = await prisma.funds.findFirst({
      where: {
        id: projectId,
        moduleType: 'WORLDBANKGROUP'
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'WorldBankGroup project not found' },
        { status: 404 }
      );
    }

    await prisma.funds.delete({
      where: { id: projectId }
    });

    return NextResponse.json({
      success: true,
      message: 'WorldBankGroup project deleted successfully'
    });
  } catch (error) {
    console.error('[WorldBankGroup Projects] Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete WorldBankGroup project' },
      { status: 500 }
    );
  }
}
