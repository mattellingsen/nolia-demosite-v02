import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from '@/lib/aws-credentials';

// CRITICAL FIX: Create S3 client lazily to ensure Lambda execution role is available
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: getAWSCredentials(),
    });
  }
  return s3Client;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const project = await prisma.funds.findUnique({
      where: {
        id: projectId,
        moduleType: 'WORLDBANK' // KEY: Ensure only worldbank projects
      },
      include: {
        fund_documents: true
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Return project data with document metadata (not binary data)
    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        applicationFormAnalysis: project.applicationFormAnalysis,
        selectionCriteriaAnalysis: project.selectionCriteriaAnalysis,
        goodExamplesAnalysis: project.goodExamplesAnalysis,
        documents: project.fund_documents.map(doc => ({
          id: doc.id,
          documentType: doc.documentType,
          filename: doc.filename,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // First check if project exists and is worldbank module
    const existingProject = await prisma.funds.findUnique({
      where: {
        id: projectId,
        moduleType: 'WORLDBANK' // KEY: Ensure only worldbank projects
      }
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update project status
    const updatedProject = await prisma.funds.update({
      where: { id: projectId },
      data: { status }
    });

    return NextResponse.json({
      success: true,
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        status: updatedProject.status,
        createdAt: updatedProject.createdAt,
        updatedAt: updatedProject.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // First check if the project exists with its documents
    const project = await prisma.funds.findUnique({
      where: {
        id: projectId,
        moduleType: 'WORLDBANK' // KEY: Ensure only worldbank projects
      },
      include: { fund_documents: true }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete all documents from S3
    if (project.fund_documents.length > 0) {
      const deletePromises = project.fund_documents.map(async (doc) => {
        try {
          await getS3Client().send(new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: doc.s3Key,
          }));
        } catch (s3Error) {
          console.error(`Failed to delete S3 object ${doc.s3Key}:`, s3Error);
          // Continue even if S3 deletion fails
        }
      });

      await Promise.allSettled(deletePromises);
    }

    // Delete the project from database (this will cascade delete documents and background jobs)
    await prisma.funds.delete({
      where: { id: projectId }
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
