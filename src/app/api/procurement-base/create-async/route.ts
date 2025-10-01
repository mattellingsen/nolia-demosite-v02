import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sqsService } from '@/lib/sqs-service';
import crypto from 'crypto';

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// POST: Create procurement base asynchronously with document processing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      moduleType,
      policyFiles = [],
      complianceFiles = [],
      templateFiles = [],
      governanceFiles = []
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Base name is required' },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existingBase = await prisma.fund.findFirst({
      where: {
        name: name.trim(),
        moduleType: 'PROCUREMENT_ADMIN'
      }
    });

    if (existingBase) {
      return NextResponse.json(
        { error: 'A procurement base with this name already exists' },
        { status: 409 }
      );
    }

    // Create the procurement base
    const base = await prisma.fund.create({
      data: {
        name: name.trim(),
        description: description || null,
        status: 'DRAFT',
        moduleType: 'PROCUREMENT_ADMIN',
        brainVersion: 1
      }
    });

    // Process and upload documents
    const documentUploads = [];
    const allFiles = [
      ...policyFiles.map((f: any) => ({ ...f, documentType: 'APPLICATION_FORM' })), // Reuse enum
      ...complianceFiles.map((f: any) => ({ ...f, documentType: 'SELECTION_CRITERIA' })),
      ...templateFiles.map((f: any) => ({ ...f, documentType: 'GOOD_EXAMPLES' })),
      ...governanceFiles.map((f: any) => ({ ...f, documentType: 'OUTPUT_TEMPLATES' }))
    ];

    for (const file of allFiles) {
      try {
        // Generate S3 key
        const documentKey = `procurement-admin/${base.id}/${crypto.randomUUID()}-${file.filename}`;

        // Convert base64 to buffer
        const fileBuffer = Buffer.from(file.content, 'base64');

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_DOCUMENTS!,
          Key: documentKey,
          Body: fileBuffer,
          ContentType: file.mimeType,
        }));

        // Create document record
        const document = await prisma.fundDocument.create({
          data: {
            fundId: base.id,
            documentType: file.documentType,
            filename: file.filename,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            s3Key: documentKey,
            moduleType: 'PROCUREMENT_ADMIN'
          }
        });

        documentUploads.push({
          documentId: document.id,
          filename: file.filename,
          s3Key: documentKey,
          documentType: file.documentType
        });

      } catch (uploadError) {
        console.error('Error uploading document:', uploadError);
        // Continue with other documents rather than failing completely
      }
    }

    // Queue documents for processing via SQS (like funding system)
    let job = null;
    if (documentUploads.length > 0) {
      job = await sqsService.queueDocumentProcessing(base.id, documentUploads.map(doc => ({
        id: doc.documentId,
        s3Key: doc.s3Key,
        documentType: doc.documentType,
        filename: doc.filename,
        mimeType: 'application/pdf' // Will be properly set from file data
      })));
    }

    // Keep status as DRAFT until brain building completes
    const finalStatus = documentUploads.length > 0 ? 'DRAFT' : 'ACTIVE';

    await prisma.fund.update({
      where: { id: base.id },
      data: { status: finalStatus }
    });

    return NextResponse.json({
      success: true,
      base: {
        id: base.id,
        name: base.name,
        description: base.description,
        status: finalStatus,
        createdAt: base.createdAt.toISOString(),
        updatedAt: base.updatedAt.toISOString()
      },
      jobId: job?.id,
      documentsUploaded: documentUploads.length,
      message: `Procurement base created and ${documentUploads.length} documents queued for processing`
    });

  } catch (error) {
    console.error('Error creating procurement base:', error);
    return NextResponse.json(
      { error: 'Failed to create procurement base' },
      { status: 500 }
    );
  }
}