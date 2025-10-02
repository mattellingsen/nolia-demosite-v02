import { NextRequest, NextResponse } from 'next/server';
import { getFundWithDocuments, prisma } from '@/lib/database-s3';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from '@/lib/aws-credentials';

// S3 client with EXPLICIT IAM role credentials
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: getAWSCredentials(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;
    
    const fund = await getFundWithDocuments(fundId);
    
    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      );
    }

    // Return fund data with document metadata (not binary data)
    return NextResponse.json({
      success: true,
      fund: {
        id: fund.id,
        name: fund.name,
        description: fund.description,
        status: fund.status,
        createdAt: fund.createdAt,
        updatedAt: fund.updatedAt,
        applicationFormAnalysis: fund.applicationFormAnalysis,
        selectionCriteriaAnalysis: fund.selectionCriteriaAnalysis,
        goodExamplesAnalysis: fund.goodExamplesAnalysis,
        documents: fund.documents.map(doc => ({
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
    console.error('Error fetching fund:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fund' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;
    
    // First check if the fund exists with its documents
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: { documents: true }
    });
    
    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      );
    }

    // Delete all documents from S3
    if (fund.documents.length > 0) {
      const deletePromises = fund.documents.map(async (doc) => {
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

    // Delete the fund from database (this will cascade delete documents and background jobs)
    await prisma.fund.delete({
      where: { id: fundId }
    });

    return NextResponse.json({
      success: true,
      message: 'Fund deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting fund:', error);
    return NextResponse.json(
      { error: 'Failed to delete fund' },
      { status: 500 }
    );
  }
}