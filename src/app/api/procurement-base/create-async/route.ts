import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

    // Create background job for document analysis
    if (documentUploads.length > 0) {
      await prisma.backgroundJob.create({
        data: {
          fundId: base.id,
          type: 'DOCUMENT_ANALYSIS',
          status: 'PENDING',
          progress: 0,
          totalDocuments: documentUploads.length,
          processedDocuments: 0,
          metadata: {
            queuedAt: new Date().toISOString(),
            documentIds: documentUploads.map(d => d.documentId)
          },
          moduleType: 'PROCUREMENT_ADMIN'
        }
      });
    }

    // Update base status to processing
    await prisma.fund.update({
      where: { id: base.id },
      data: { status: 'ACTIVE' } // Set to ACTIVE for procurement admin bases
    });

    return NextResponse.json({
      success: true,
      base: {
        id: base.id,
        name: base.name,
        description: base.description,
        status: 'ACTIVE',
        createdAt: base.createdAt.toISOString(),
        updatedAt: base.updatedAt.toISOString()
      },
      documentsUploaded: documentUploads.length,
      message: `Procurement base created with ${documentUploads.length} documents`
    });

  } catch (error) {
    console.error('Error creating procurement base:', error);
    return NextResponse.json(
      { error: 'Failed to create procurement base' },
      { status: 500 }
    );
  }
}