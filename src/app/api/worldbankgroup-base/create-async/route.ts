import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from '@/lib/aws-credentials';
import { mockBaseAnalysis } from '@/lib/worldbankgroup-mock-data';

const prisma = new PrismaClient();

// CRITICAL FIX: Create S3 client lazily to ensure Lambda execution role is available
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    console.log('🔐 [WorldBankGroup] Creating new S3 client');
    const credentials = getAWSCredentials();

    s3Client = new S3Client({
      region: AWS_REGION,
      ...(credentials && { credentials }),
    });

    console.log('✅ [WorldBankGroup] S3 client created successfully');
  }
  return s3Client;
}

// POST: Create worldbankgroup base asynchronously (FAKE DEMO - no AI processing)
export async function POST(req: NextRequest) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [WorldBankGroup] API Route /api/worldbankgroup-base/create-async called');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const body = await req.json();
    console.log('📦 [WorldBankGroup] Request body keys:', Object.keys(body));

    const {
      name,
      description,
      moduleType,
      policyFiles = [],
      complianceFiles = [],
      templateFiles = [],
      governanceFiles = []
    } = body;

    console.log('🚀 [WorldBankGroup] Creating base:', {
      name,
      moduleType,
      totalFiles: (policyFiles?.length || 0) + (complianceFiles?.length || 0) + (templateFiles?.length || 0) + (governanceFiles?.length || 0)
    });

    if (!name) {
      return NextResponse.json(
        { error: 'Base name is required' },
        { status: 400 }
      );
    }

    // Check if name already exists (for WORLDBANKGROUP_ADMIN module type)
    const existingBase = await prisma.funds.findFirst({
      where: {
        name: name.trim(),
        moduleType: 'WORLDBANKGROUP_ADMIN'
      }
    });

    if (existingBase) {
      return NextResponse.json(
        { error: 'A WorldBankGroup base with this name already exists' },
        { status: 409 }
      );
    }

    // Create the worldbankgroup base
    const baseId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO funds (id, name, description, status, "moduleType", "brainVersion", "createdAt", "updatedAt")
      VALUES (${baseId}, ${name.trim()}, ${description || null}, 'DRAFT', 'WORLDBANKGROUP_ADMIN', 1, NOW(), NOW())
    `;

    // Fetch the created base
    const base: any = await prisma.$queryRaw`
      SELECT * FROM funds WHERE id = ${baseId}
    `.then(rows => rows[0]);

    console.log('✅ [WorldBankGroup] Base created:', base.id);

    // Process and upload documents to S3 (REAL UPLOAD)
    const documentUploads = [];

    // Map file categories to correct document types
    const allFiles = [
      ...(policyFiles || []).map((f: any) => ({ ...f, documentType: 'POLICY_DOCUMENT' })),
      ...(complianceFiles || []).map((f: any) => ({ ...f, documentType: 'COMPLIANCE_STANDARD' })),
      ...(templateFiles || []).map((f: any) => ({ ...f, documentType: 'PROCUREMENT_TEMPLATE' })),
      ...(governanceFiles || []).map((f: any) => ({ ...f, documentType: 'PROCUREMENT_RULE' }))
    ];

    console.log(`📁 [WorldBankGroup] Processing ${allFiles.length} files for upload`);

    for (const file of allFiles) {
      try {
        console.log(`📄 [WorldBankGroup] Processing file: ${file.filename} (${file.documentType})`);

        // Validate file has required properties
        if (!file.content) {
          console.error(`❌ [WorldBankGroup] File ${file.filename} missing content`);
          continue;
        }

        if (!file.filename) {
          console.error(`❌ [WorldBankGroup] File missing filename`);
          continue;
        }

        // Generate S3 key with worldbankgroup-admin prefix
        const documentKey = `worldbankgroup-admin/${base.id}/${crypto.randomUUID()}-${file.filename}`;

        // Convert base64 to buffer
        let fileBuffer;
        try {
          fileBuffer = Buffer.from(file.content, 'base64');
          console.log(`📤 [WorldBankGroup] Converted to buffer, size: ${fileBuffer.length} bytes`);
        } catch (bufferError) {
          console.error(`❌ [WorldBankGroup] Failed to convert base64:`, bufferError);
          throw bufferError;
        }

        console.log(`📤 [WorldBankGroup] Uploading ${file.filename} to S3 key: ${documentKey}`);

        // Upload to S3 (REAL UPLOAD)
        const putObjectCommand = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_DOCUMENTS!,
          Key: documentKey,
          Body: fileBuffer,
          ContentType: file.mimeType,
        });

        const s3Response = await getS3Client().send(putObjectCommand);
        console.log(`✅ [WorldBankGroup] S3 upload successful for ${file.filename}`, {
          ETag: s3Response.ETag
        });

        // Create document record with WORLDBANKGROUP_ADMIN module type
        const document = await prisma.fund_documents.create({
          data: {
            id: crypto.randomUUID(),
            fundId: base.id,
            documentType: file.documentType,
            filename: file.filename,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            s3Key: documentKey,
            moduleType: 'WORLDBANKGROUP_ADMIN'
          }
        });

        console.log(`✅ [WorldBankGroup] Database record created for ${file.filename} (ID: ${document.id})`);

        documentUploads.push({
          documentId: document.id,
          filename: file.filename,
          s3Key: documentKey,
          documentType: file.documentType
        });

      } catch (uploadError) {
        console.error(`❌ [WorldBankGroup] Error uploading document ${file.filename}:`, uploadError);
        (documentUploads as any[]).push({
          documentId: 'error',
          filename: file.filename,
          s3Key: 'error',
          documentType: file.documentType,
          error: uploadError instanceof Error ? uploadError.message : String(uploadError)
        });
      }
    }

    const successfulUploads = documentUploads.filter((upload: any) => upload.documentId !== 'error');
    const failedUploads = documentUploads.filter((upload: any) => upload.documentId === 'error');

    console.log(`📊 [WorldBankGroup] Upload summary: ${successfulUploads.length} successful, ${failedUploads.length} failed`);

    // FAKE DEMO: Create job with PROCESSING status (never completes)
    // Skip SQS queue, skip Claude AI, skip OpenSearch
    let job = null;
    if (successfulUploads.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎭 [WorldBankGroup FAKE DEMO] Creating PROCESSING job (will never complete)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Generate mock analysis data
      const mockAnalysis = mockBaseAnalysis();

      // Store mock analysis in the fund record
      await prisma.funds.update({
        where: { id: base.id },
        data: {
          policyDocumentAnalysis: mockAnalysis.policyDocumentAnalysis,
          procurementRuleAnalysis: mockAnalysis.procurementRuleAnalysis,
          complianceStandardAnalysis: mockAnalysis.complianceStandardAnalysis,
          procurementTemplateAnalysis: mockAnalysis.procurementTemplateAnalysis
        }
      });

      // Create job with PROCESSING status
      job = await prisma.background_jobs.create({
        data: {
          id: crypto.randomUUID(),
          fundId: base.id,
          type: 'DOCUMENT_ANALYSIS',
          status: 'PROCESSING', // Will stay in PROCESSING forever for demo
          totalDocuments: successfulUploads.length,
          processedDocuments: 0,
          progress: 45, // Fake progress indicator
          metadata: {
            documentIds: successfulUploads.map(d => d.documentId),
            fakeDemo: true,
            message: 'Processing documents... This typically takes 20-30 minutes.'
          },
          moduleType: 'WORLDBANKGROUP_ADMIN',
          startedAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('✅ [WorldBankGroup FAKE DEMO] Job created with PROCESSING status:', job.id);
      console.log('📝 [WorldBankGroup FAKE DEMO] Mock analysis data stored in fund record');
      console.log('⏸️  [WorldBankGroup FAKE DEMO] Job will remain in PROCESSING state for demo');
    }

    // Keep status as DRAFT (never becomes ACTIVE for demo)
    const finalStatus = 'DRAFT';

    await prisma.funds.update({
      where: { id: base.id },
      data: { status: finalStatus }
    });

    const hasErrors = failedUploads.length > 0;
    const overallSuccess = successfulUploads.length > 0;

    return NextResponse.json({
      success: overallSuccess,
      base: {
        id: base.id,
        name: base.name,
        description: base.description,
        status: finalStatus,
        createdAt: base.createdAt.toISOString(),
        updatedAt: base.updatedAt.toISOString()
      },
      jobId: job?.id,
      documentsUploaded: successfulUploads.length,
      documentsFailed: failedUploads.length,
      message: hasErrors
        ? `WorldBankGroup base created with ${successfulUploads.length} successful uploads and ${failedUploads.length} failures`
        : `WorldBankGroup base created and ${successfulUploads.length} documents are being processed`,
      warnings: hasErrors ? failedUploads.map((upload: any) => `Failed to upload ${upload.filename}: ${upload.error}`) : [],
      fakeDemo: true,
      demoNote: 'This is a demo environment. Documents uploaded to S3, but AI processing is simulated.'
    });

  } catch (error) {
    console.error('[WorldBankGroup] Error creating base:', error);
    return NextResponse.json(
      {
        error: 'Failed to create WorldBankGroup base',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
