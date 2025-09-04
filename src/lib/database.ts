import { PrismaClient } from '@prisma/client';
import { put } from '@vercel/blob';

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

// Helper functions for the funding system

/**
 * Save a Fund with its documents to the database using Vercel Blob storage
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

  // Upload application form to Blob storage
  let applicationFormBlobUrl: string | undefined;
  if (applicationForm) {
    const blob = await put(`application-forms/${Date.now()}-${applicationForm.filename}`, applicationForm.file, {
      access: 'public',
      contentType: applicationForm.mimeType,
    });
    applicationFormBlobUrl = blob.url;
  }

  // Upload selection criteria files to Blob storage
  const selectionCriteriaBlobUrls: string[] = [];
  if (selectionCriteria) {
    for (const doc of selectionCriteria) {
      const blob = await put(`selection-criteria/${Date.now()}-${doc.filename}`, doc.file, {
        access: 'public',
        contentType: doc.mimeType,
      });
      selectionCriteriaBlobUrls.push(blob.url);
    }
  }

  // Upload good examples files to Blob storage
  const goodExamplesBlobUrls: string[] = [];
  if (goodExamples) {
    for (const doc of goodExamples) {
      const blob = await put(`good-examples/${Date.now()}-${doc.filename}`, doc.file, {
        access: 'public',
        contentType: doc.mimeType,
      });
      goodExamplesBlobUrls.push(blob.url);
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
          ...(applicationForm && applicationFormBlobUrl ? [{
            documentType: 'APPLICATION_FORM' as const,
            filename: applicationForm.filename,
            mimeType: applicationForm.mimeType,
            fileSize: applicationForm.file.length,
            blobUrl: applicationFormBlobUrl,
          }] : []),
          // Selection criteria (multiple)
          ...(selectionCriteria?.map((doc, index) => ({
            documentType: 'SELECTION_CRITERIA' as const,
            filename: doc.filename,
            mimeType: doc.mimeType,
            fileSize: doc.file.length,
            blobUrl: selectionCriteriaBlobUrls[index],
          })) || []),
          // Good examples (multiple)
          ...(goodExamples?.map((doc, index) => ({
            documentType: 'GOOD_EXAMPLES' as const,
            filename: doc.filename,
            mimeType: doc.mimeType,
            fileSize: doc.file.length,
            blobUrl: goodExamplesBlobUrls[index],
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

  return {
    filename: document.filename,
    mimeType: document.mimeType,
    blobUrl: document.blobUrl,
    fundName: document.fund.name
  };
}