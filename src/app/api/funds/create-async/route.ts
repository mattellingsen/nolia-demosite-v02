import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { sqsService } from '@/lib/sqs-service';
import { FundStatus, DocumentType } from '@prisma/client';

interface CreateFundAsyncRequest {
  name: string;
  description?: string;
  applicationFormFile?: {
    filename: string;
    mimeType: string;
    fileSize: number;
    content: string; // base64
  };
  selectionCriteriaFiles?: Array<{
    filename: string;
    mimeType: string;
    fileSize: number;
    content: string; // base64
  }>;
  goodExamplesFiles?: Array<{
    filename: string;
    mimeType: string;
    fileSize: number;
    content: string; // base64
  }>;
  outputTemplatesFiles?: Array<{
    filename: string;
    mimeType: string;
    fileSize: number;
    content: string; // base64
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateFundAsyncRequest = await request.json();
    const { name, description, applicationFormFile, selectionCriteriaFiles, goodExamplesFiles, outputTemplatesFiles } = body;

    if (!name) {
      return NextResponse.json({
        error: 'Fund name is required'
      }, { status: 400 });
    }

    // Create fund record using raw SQL to avoid Prisma schema mismatch
    const fundId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO funds (id, name, description, status, "createdAt", "updatedAt")
      VALUES (${fundId}, ${name}, ${description || 'Fund innovative businesses to employ tertiary-level students as full-time interns over their summer break.'}, 'DRAFT', NOW(), NOW())
    `;

    // Fetch the created fund
    const fund: any = await prisma.$queryRaw`
      SELECT * FROM funds WHERE id = ${fundId}
    `.then((rows: any[]) => rows[0]);

    // Collect all files for async processing
    const documentsToProcess: Array<{
      filename: string;
      mimeType: string;
      fileSize: number;
      content: string;
      documentType: DocumentType;
    }> = [];

    if (applicationFormFile) {
      documentsToProcess.push({
        filename: applicationFormFile.filename,
        mimeType: applicationFormFile.mimeType,
        fileSize: applicationFormFile.fileSize,
        content: applicationFormFile.content,
        documentType: DocumentType.APPLICATION_FORM,
      });
    }

    if (selectionCriteriaFiles) {
      selectionCriteriaFiles.forEach(file => {
        documentsToProcess.push({
          filename: file.filename,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          content: file.content,
          documentType: DocumentType.SELECTION_CRITERIA,
        });
      });
    }

    if (goodExamplesFiles) {
      goodExamplesFiles.forEach(file => {
        documentsToProcess.push({
          filename: file.filename,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          content: file.content,
          documentType: DocumentType.GOOD_EXAMPLES,
        });
      });
    }

    if (outputTemplatesFiles) {
      outputTemplatesFiles.forEach(file => {
        documentsToProcess.push({
          filename: file.filename,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          content: file.content,
          documentType: DocumentType.OUTPUT_TEMPLATES,
        });
      });
    }

    if (documentsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        fund,
        message: 'Fund created successfully (no documents to process)',
      });
    }

    // Upload to S3
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getAWSCredentials, AWS_REGION, S3_BUCKET } = await import('@/lib/aws-credentials');
    const crypto = await import('crypto');

    // CRITICAL FIX: Create S3 client using lazy pattern
    let s3ClientInstance: InstanceType<typeof S3Client> | null = null;
    const getS3Client = () => {
      if (!s3ClientInstance) {
        s3ClientInstance = new S3Client({
          region: AWS_REGION,
          credentials: getAWSCredentials(),
        });
      }
      return s3ClientInstance;
    };
    const documentRecords = [];

    for (const doc of documentsToProcess) {
      // Generate unique S3 key
      const folder = doc.documentType?.toLowerCase().replace('_', '-') || 'unknown';
      const s3Key = `${folder}/${crypto.randomUUID()}-${doc.filename}`;

      // Convert base64 to buffer
      const buffer = Buffer.from(doc.content, 'base64');

      // Upload to S3
      await getS3Client().send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: doc.mimeType,
      }));

      // Create document record
      const documentRecord = await prisma.fund_documents.create({
        data: {
          fundId: fund.id,
          documentType: doc.documentType,
          filename: doc.filename,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          s3Key,
        },
      });

      documentRecords.push({
        id: documentRecord.id,
        s3Key: documentRecord.s3Key,
        documentType: documentRecord.documentType,
        filename: documentRecord.filename,
        mimeType: documentRecord.mimeType,
      });
    }

    // Queue documents for processing
    const job = await sqsService.queueDocumentProcessing(fund.id, documentRecords);

    return NextResponse.json({
      success: true,
      fund,
      jobId: job.id,
      documentsQueued: documentRecords.length,
      message: `Fund created and ${documentRecords.length} documents queued for processing`,
    });

  } catch (error) {
    console.error('Error creating async fund:', error);
    return NextResponse.json({
      error: 'Failed to create fund',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}