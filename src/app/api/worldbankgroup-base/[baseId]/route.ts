import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Get a specific worldbankgroup base
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ baseId: string }> }
) {
  try {
    const { baseId } = await params;

    const base = await prisma.funds.findFirst({
      where: {
        id: baseId,
        moduleType: 'WORLDBANKGROUP_ADMIN'
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

    if (!base) {
      return NextResponse.json(
        { error: 'WorldBankGroup base not found' },
        { status: 404 }
      );
    }

    // Transform to match expected interface
    const transformedBase = {
      id: base.id,
      name: base.name,
      description: base.description,
      status: base.status,
      createdAt: base.createdAt.toISOString(),
      updatedAt: base.updatedAt.toISOString(),
      brainAssembledAt: base.brainAssembledAt?.toISOString(),
      brainVersion: base.brainVersion,
      documentsCount: base.fund_documents.length,
      documents: base.fund_documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        filename: doc.filename,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt.toISOString()
      })),
      background_jobs: base.background_jobs.map(job => ({
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
      base: transformedBase
    });
  } catch (error) {
    console.error('[WorldBankGroup] Error fetching base:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WorldBankGroup base' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a worldbankgroup base
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ baseId: string }> }
) {
  try {
    const { baseId } = await params;

    // Check if base exists and is a worldbankgroup admin base
    const base = await prisma.funds.findFirst({
      where: {
        id: baseId,
        moduleType: 'WORLDBANKGROUP_ADMIN'
      }
    });

    if (!base) {
      return NextResponse.json(
        { error: 'WorldBankGroup base not found' },
        { status: 404 }
      );
    }

    // Delete the base (cascade will handle related records)
    await prisma.funds.delete({
      where: { id: baseId }
    });

    return NextResponse.json({
      success: true,
      message: 'WorldBankGroup base deleted successfully'
    });
  } catch (error) {
    console.error('[WorldBankGroup] Error deleting base:', error);
    return NextResponse.json(
      { error: 'Failed to delete WorldBankGroup base' },
      { status: 500 }
    );
  }
}
