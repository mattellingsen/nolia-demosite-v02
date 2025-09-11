import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Global variable to prevent multiple Prisma instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// S3 client configuration - force IAM Role in production, explicit credentials in development
const s3Client = new S3Client({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
  // Only use explicit credentials in development when they are intentionally set
  ...(process.env.NODE_ENV === 'development' && 
      process.env.AWS_ACCESS_KEY_ID && 
      process.env.AWS_SECRET_ACCESS_KEY && 
      !process.env.AWS_ACCESS_KEY_ID.startsWith('ASIA') ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  } : {
    // In production or when ASIA credentials are detected, force IAM Role by not providing credentials
  }),
});

const S3_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'nolia-funding-documents-599065966827';

/**
 * Upload file to S3 and return the key
 */
async function uploadFileToS3(buffer: Buffer, filename: string, mimeType: string, folder: string): Promise<string> {
  const key = `${folder}/${crypto.randomUUID()}-${filename}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));
  
  return key;
}

/**
 * Generate pre-signed URL for downloading from S3
 */
export async function generateS3DownloadUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Save a Fund with its documents to the database using S3 storage
 */
export async function saveFundWithDocuments(fundData: {
  name: string;
  description?: string;
  applicationForm?: {
    file: Buffer;
    filename: string;
    mimeType: string;
    analysis: any;
  };
  selectionCriteria?: Array<{
    file: Buffer;
    filename: string;
    mimeType: string;
  }>;
  selectionCriteriaAnalysis?: any;
  goodExamples?: Array<{
    file: Buffer;
    filename: string;
    mimeType: string;
  }>;
  goodExamplesAnalysis?: any;
}) {
  const { 
    name, 
    description, 
    applicationForm, 
    selectionCriteria, 
    selectionCriteriaAnalysis,
    goodExamples, 
    goodExamplesAnalysis 
  } = fundData;

  // Upload application form to S3
  let applicationFormS3Key: string | undefined;
  if (applicationForm) {
    applicationFormS3Key = await uploadFileToS3(
      applicationForm.file, 
      applicationForm.filename, 
      applicationForm.mimeType, 
      'application-forms'
    );
  }

  // Upload selection criteria files to S3
  const selectionCriteriaS3Keys: string[] = [];
  if (selectionCriteria) {
    for (const doc of selectionCriteria) {
      const s3Key = await uploadFileToS3(
        doc.file, 
        doc.filename, 
        doc.mimeType, 
        'selection-criteria'
      );
      selectionCriteriaS3Keys.push(s3Key);
    }
  }

  // Upload good examples files to S3
  const goodExamplesS3Keys: string[] = [];
  if (goodExamples) {
    for (const doc of goodExamples) {
      const s3Key = await uploadFileToS3(
        doc.file, 
        doc.filename, 
        doc.mimeType, 
        'good-examples'
      );
      goodExamplesS3Keys.push(s3Key);
    }
  }

  const fund = await prisma.fund.create({
    data: {
      name,
      description,
      applicationFormAnalysis: applicationForm?.analysis,
      selectionCriteriaAnalysis,
      goodExamplesAnalysis,
      documents: {
        create: [
          // Application form (single)
          ...(applicationForm && applicationFormS3Key ? [{
            documentType: 'APPLICATION_FORM' as const,
            filename: applicationForm.filename,
            mimeType: applicationForm.mimeType,
            fileSize: applicationForm.file.length,
            s3Key: applicationFormS3Key,
          }] : []),
          // Selection criteria (multiple)
          ...(selectionCriteria?.map((doc, index) => ({
            documentType: 'SELECTION_CRITERIA' as const,
            filename: doc.filename,
            mimeType: doc.mimeType,
            fileSize: doc.file.length,
            s3Key: selectionCriteriaS3Keys[index],
          })) || []),
          // Good examples (multiple)
          ...(goodExamples?.map((doc, index) => ({
            documentType: 'GOOD_EXAMPLES' as const,
            filename: doc.filename,
            mimeType: doc.mimeType,
            fileSize: doc.file.length,
            s3Key: goodExamplesS3Keys[index],
          })) || []),
        ]
      }
    },
    include: {
      documents: true
    }
  });

  return fund;
}

/**
 * Get a fund with all its documents
 */
export async function getFundWithDocuments(fundId: string) {
  return await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      documents: true
    }
  });
}

/**
 * Get all funds with document counts
 */
export async function getAllFunds() {
  return await prisma.fund.findMany({
    include: {
      _count: {
        select: { documents: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Convert File objects to Buffer for database storage
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get document by ID and return download URL
 */
export async function getDocumentForDownload(documentId: string) {
  const document = await prisma.fundDocument.findUnique({
    where: { id: documentId },
    include: { fund: true }
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Generate pre-signed URL for S3 download
  const downloadUrl = await generateS3DownloadUrl(document.s3Key);

  return {
    filename: document.filename,
    mimeType: document.mimeType,
    downloadUrl,
    fundName: document.fund.name
  };
}