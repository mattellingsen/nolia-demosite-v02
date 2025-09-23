import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/database-s3';
import { sqsService } from '@/lib/sqs-service';
import { DocumentType } from '@prisma/client';
import crypto from 'crypto';

// S3 client configuration - matches pattern from database-s3.ts
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

interface UploadRequest {
  fundId: string;
  documents: Array<{
    filename: string;
    mimeType: string;
    fileSize: number;
    documentType: 'APPLICATION_FORM' | 'SELECTION_CRITERIA' | 'GOOD_EXAMPLES' | 'OUTPUT_TEMPLATES';
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadRequest = await request.json();
    const { fundId, documents } = body;

    if (!fundId || !documents || documents.length === 0) {
      return NextResponse.json({
        error: 'Fund ID and documents are required'
      }, { status: 400 });
    }

    // Validate fund exists
    const fund = await prisma.fund.findUnique({
      where: { id: fundId }
    });

    if (!fund) {
      return NextResponse.json({
        error: 'Fund not found'
      }, { status: 404 });
    }

    // Validate file types and sizes
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    const maxFileSize = 50 * 1024 * 1024; // 50MB

    for (const doc of documents) {
      if (!allowedTypes.includes(doc.mimeType)) {
        return NextResponse.json({
          error: `File type ${doc.mimeType} is not allowed for ${doc.filename}`
        }, { status: 400 });
      }

      if (doc.fileSize > maxFileSize) {
        return NextResponse.json({
          error: `File ${doc.filename} is too large. Maximum size is 50MB`
        }, { status: 400 });
      }
    }

    // Generate presigned URLs and create document records
    const uploadRequests = [];
    const documentRecords = [];

    for (const doc of documents) {
      // Generate unique S3 key
      const folder = doc.documentType.toLowerCase().replace('_', '-');
      const s3Key = `${folder}/${crypto.randomUUID()}-${doc.filename}`;

      // Create document record in database
      const documentRecord = await prisma.fundDocument.create({
        data: {
          fundId,
          documentType: doc.documentType as DocumentType,
          filename: doc.filename,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          s3Key,
        },
      });

      documentRecords.push(documentRecord);

      // Generate presigned URL for upload
      const putCommand = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        ContentType: doc.mimeType,
        ContentLength: doc.fileSize,
      });

      const presignedUrl = await getSignedUrl(s3Client, putCommand, {
        expiresIn: 3600, // 1 hour
      });

      uploadRequests.push({
        documentId: documentRecord.id,
        filename: doc.filename,
        s3Key,
        presignedUrl,
        documentType: doc.documentType,
      });
    }

    // Queue documents for processing
    const job = await sqsService.queueDocumentProcessing(
      fundId,
      documentRecords.map(doc => ({
        id: doc.id,
        s3Key: doc.s3Key,
        documentType: doc.documentType,
        filename: doc.filename,
        mimeType: doc.mimeType,
      }))
    );

    // In development, trigger processing automatically after a short delay
    // to allow S3 uploads to complete
    if (process.env.NODE_ENV === 'development') {
      setTimeout(async () => {
        try {
          console.log(`Auto-triggering processing for job ${job.id} in development mode...`);
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/jobs/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: job.id })
          });
          
          if (!response.ok) {
            console.error('Failed to auto-trigger processing:', await response.text());
          } else {
            console.log('Auto-processing triggered successfully');
          }
        } catch (error) {
          console.error('Error auto-triggering processing:', error);
        }
      }, 10000); // 10 second delay to allow S3 uploads to complete
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      uploads: uploadRequests,
      message: `${documents.length} documents queued for processing`,
    });

  } catch (error) {
    console.error('Error setting up async upload:', error);
    return NextResponse.json({
      error: 'Failed to setup async upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check if async upload is available
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Async upload service is available',
      maxFileSize: '50MB',
      allowedTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ],
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Async upload service unavailable'
    }, { status: 503 });
  }
}