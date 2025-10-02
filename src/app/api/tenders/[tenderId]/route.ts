import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { forceIAMRole } from '@/lib/force-iam-role';

// CRITICAL: Force IAM role usage in production (prevents SSO errors)
forceIAMRole();

// S3 client for deleting documents
const s3Client = new S3Client({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
  ...(process.env.NODE_ENV === 'development' &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      !process.env.AWS_ACCESS_KEY_ID.startsWith('ASIA') ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  } : {}),
});

const S3_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'nolia-funding-documents-ap-southeast-2-599065966827';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenderId: string }> }
) {
  try {
    const { tenderId } = await params;

    const tender = await prisma.fund.findUnique({
      where: {
        id: tenderId,
        moduleType: 'PROCUREMENT' // KEY: Ensure only procurement tenders
      },
      include: {
        documents: true
      }
    });

    if (!tender) {
      return NextResponse.json(
        { error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Return tender data with document metadata (not binary data)
    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        name: tender.name,
        description: tender.description,
        status: tender.status,
        createdAt: tender.createdAt,
        updatedAt: tender.updatedAt,
        applicationFormAnalysis: tender.applicationFormAnalysis,
        selectionCriteriaAnalysis: tender.selectionCriteriaAnalysis,
        goodExamplesAnalysis: tender.goodExamplesAnalysis,
        documents: tender.documents.map(doc => ({
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
    console.error('Error fetching tender:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tender' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenderId: string }> }
) {
  try {
    const { tenderId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // First check if tender exists and is procurement module
    const existingTender = await prisma.fund.findUnique({
      where: {
        id: tenderId,
        moduleType: 'PROCUREMENT' // KEY: Ensure only procurement tenders
      }
    });

    if (!existingTender) {
      return NextResponse.json(
        { error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Update tender status
    const updatedTender = await prisma.fund.update({
      where: { id: tenderId },
      data: { status }
    });

    return NextResponse.json({
      success: true,
      tender: {
        id: updatedTender.id,
        name: updatedTender.name,
        description: updatedTender.description,
        status: updatedTender.status,
        createdAt: updatedTender.createdAt,
        updatedAt: updatedTender.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating tender:', error);
    return NextResponse.json(
      { error: 'Failed to update tender' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenderId: string }> }
) {
  try {
    const { tenderId } = await params;

    // First check if the tender exists with its documents
    const tender = await prisma.fund.findUnique({
      where: {
        id: tenderId,
        moduleType: 'PROCUREMENT' // KEY: Ensure only procurement tenders
      },
      include: { documents: true }
    });

    if (!tender) {
      return NextResponse.json(
        { error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Delete all documents from S3
    if (tender.documents.length > 0) {
      const deletePromises = tender.documents.map(async (doc) => {
        try {
          await s3Client.send(new DeleteObjectCommand({
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

    // Delete the tender from database (this will cascade delete documents and background jobs)
    await prisma.fund.delete({
      where: { id: tenderId }
    });

    return NextResponse.json({
      success: true,
      message: 'Tender deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting tender:', error);
    return NextResponse.json(
      { error: 'Failed to delete tender' },
      { status: 500 }
    );
  }
}