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
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateFundAsyncRequest = await request.json();
    const { name, description, applicationFormFile, selectionCriteriaFiles, goodExamplesFiles } = body;

    if (!name) {
      return NextResponse.json({
        error: 'Fund name is required'
      }, { status: 400 });
    }

    // Create fund record
    const fund = await prisma.fund.create({
      data: {
        name,
        description: description || 'AI-powered fund created through setup wizard',
        status: FundStatus.DRAFT,
      },
    });

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
        ...applicationFormFile,
        documentType: DocumentType.APPLICATION_FORM,
      });
    }

    if (selectionCriteriaFiles) {
      selectionCriteriaFiles.forEach(file => {
        documentsToProcess.push({
          ...file,
          documentType: DocumentType.SELECTION_CRITERIA,
        });
      });
    }

    if (goodExamplesFiles) {
      goodExamplesFiles.forEach(file => {
        documentsToProcess.push({
          ...file,
          documentType: DocumentType.GOOD_EXAMPLES,
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

    // Upload files to S3 and create document records
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const crypto = await import('crypto');

    const s3Client = new S3Client({
      region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
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

    const S3_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'nolia-funding-documents-599065966827';
    const documentRecords = [];

    for (const doc of documentsToProcess) {
      // Generate unique S3 key
      const folder = doc.documentType.toLowerCase().replace('_', '-');
      const s3Key = `${folder}/${crypto.randomUUID()}-${doc.filename}`;

      // Convert base64 to buffer
      const buffer = Buffer.from(doc.content, 'base64');

      // Upload to S3
      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: doc.mimeType,
      }));

      // Create document record
      const documentRecord = await prisma.fundDocument.create({
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