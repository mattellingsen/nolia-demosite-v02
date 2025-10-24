import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { getAWSCredentials, AWS_REGION } from '@/lib/aws-credentials';
import { mockProjectAnalysis } from '@/lib/worldbankgroup-mock-data';
import { prisma } from '@/lib/database-s3';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    console.log('🔐 [WorldBankGroup Projects] Creating new S3 client');
    const credentials = getAWSCredentials();

    s3Client = new S3Client({
      region: AWS_REGION,
      ...(credentials && { credentials }),
    });

    console.log('✅ [WorldBankGroup Projects] S3 client created successfully');
  }
  return s3Client;
}

// POST: Create worldbankgroup project asynchronously (FAKE DEMO - no AI processing)
export async function POST(req: NextRequest) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [WorldBankGroup Projects] API Route /api/worldbankgroup-projects/create-async called');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const body = await req.json();
    console.log('📦 [WorldBankGroup Projects] Request body keys:', Object.keys(body));

    const {
      name,
      description,
      moduleType,
      preRfpFiles = [],
      rfpFiles = [],
      supportingFiles = [],
      outputTemplatesFiles = []
    } = body;

    console.log('🚀 [WorldBankGroup Projects] Creating project:', {
      name,
      moduleType,
      totalFiles: (preRfpFiles?.length || 0) + (rfpFiles?.length || 0) + (supportingFiles?.length || 0) + (outputTemplatesFiles?.length || 0)
    });

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Check if name already exists (for WORLDBANKGROUP module type)
    const existingProject = await prisma.funds.findFirst({
      where: {
        name: name.trim(),
        moduleType: 'WORLDBANKGROUP'
      }
    });

    if (existingProject) {
      return NextResponse.json(
        { error: 'A WorldBankGroup project with this name already exists' },
        { status: 409 }
      );
    }

    // Create the worldbankgroup project
    const projectId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO funds (id, name, description, status, "moduleType", "brainVersion", "createdAt", "updatedAt")
      VALUES (${projectId}, ${name.trim()}, ${description || null}, 'DRAFT', 'WORLDBANKGROUP', 1, NOW(), NOW())
    `;

    // Fetch the created project
    const project: any = await prisma.$queryRaw`
      SELECT * FROM funds WHERE id = ${projectId}
    `.then((rows: any[]) => rows[0]);

    console.log('✅ [WorldBankGroup Projects] Project created:', project.id);

    // Process and upload documents to S3 (REAL UPLOAD)
    const documentUploads = [];

    // Map 4-step project files to document types
    const allFiles = [
      ...(preRfpFiles || []).map((f: any) => ({ ...f, documentType: 'APPLICATION_FORM' })),
      ...(rfpFiles || []).map((f: any) => ({ ...f, documentType: 'SELECTION_CRITERIA' })),
      ...(supportingFiles || []).map((f: any) => ({ ...f, documentType: 'GOOD_EXAMPLES' })),
      ...(outputTemplatesFiles || []).map((f: any) => ({ ...f, documentType: 'OUTPUT_TEMPLATES' }))
    ];

    console.log(`📁 [WorldBankGroup Projects] Processing ${allFiles.length} files for upload`);

    for (const file of allFiles) {
      try {
        console.log(`📄 [WorldBankGroup Projects] Processing file: ${file.filename} (${file.documentType})`);

        if (!file.content) {
          console.error(`❌ [WorldBankGroup Projects] File ${file.filename} missing content`);
          continue;
        }

        if (!file.filename) {
          console.error(`❌ [WorldBankGroup Projects] File missing filename`);
          continue;
        }

        // Generate S3 key with worldbankgroup-projects prefix
        const documentKey = `worldbankgroup-projects/${project.id}/${crypto.randomUUID()}-${file.filename}`;

        // Convert base64 to buffer
        let fileBuffer;
        try {
          fileBuffer = Buffer.from(file.content, 'base64');
          console.log(`📤 [WorldBankGroup Projects] Converted to buffer, size: ${fileBuffer.length} bytes`);
        } catch (bufferError) {
          console.error(`❌ [WorldBankGroup Projects] Failed to convert base64:`, bufferError);
          throw bufferError;
        }

        console.log(`📤 [WorldBankGroup Projects] Uploading ${file.filename} to S3 key: ${documentKey}`);

        // Upload to S3 (REAL UPLOAD)
        const putObjectCommand = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_DOCUMENTS!,
          Key: documentKey,
          Body: fileBuffer,
          ContentType: file.mimeType,
        });

        const s3Response = await getS3Client().send(putObjectCommand);
        console.log(`✅ [WorldBankGroup Projects] S3 upload successful for ${file.filename}`, {
          ETag: s3Response.ETag
        });

        // Create document record with WORLDBANKGROUP module type
        const document = await prisma.fund_documents.create({
          data: {
            id: crypto.randomUUID(),
            fundId: project.id,
            documentType: file.documentType,
            filename: file.filename,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            s3Key: documentKey,
            moduleType: 'WORLDBANKGROUP'
          }
        });

        console.log(`✅ [WorldBankGroup Projects] Database record created for ${file.filename} (ID: ${document.id})`);

        documentUploads.push({
          documentId: document.id,
          filename: file.filename,
          s3Key: documentKey,
          documentType: file.documentType
        });

      } catch (uploadError) {
        console.error(`❌ [WorldBankGroup Projects] Error uploading document ${file.filename}:`, uploadError);
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

    console.log(`📊 [WorldBankGroup Projects] Upload summary: ${successfulUploads.length} successful, ${failedUploads.length} failed`);

    // FAKE DEMO: Create job with PROCESSING status (never completes)
    let job = null;
    if (successfulUploads.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎭 [WorldBankGroup Projects FAKE DEMO] Creating PROCESSING job (will never complete)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Generate mock analysis data
      const mockAnalysis = mockProjectAnalysis();

      // Store mock analysis in the fund record
      await prisma.funds.update({
        where: { id: project.id },
        data: {
          applicationFormAnalysis: mockAnalysis.applicationFormAnalysis,
          selectionCriteriaAnalysis: mockAnalysis.selectionCriteriaAnalysis,
          goodExamplesAnalysis: mockAnalysis.goodExamplesAnalysis,
          outputTemplatesAnalysis: mockAnalysis.outputTemplatesAnalysis
        }
      });

      // Create job with PROCESSING status
      job = await prisma.background_jobs.create({
        data: {
          id: crypto.randomUUID(),
          fundId: project.id,
          type: 'DOCUMENT_ANALYSIS',
          status: 'PROCESSING',
          totalDocuments: successfulUploads.length,
          processedDocuments: 0,
          progress: 45,
          metadata: {
            documentIds: successfulUploads.map(d => d.documentId),
            fakeDemo: true,
            message: 'Processing documents... This typically takes 20-30 minutes.'
          },
          moduleType: 'WORLDBANKGROUP',
          startedAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('✅ [WorldBankGroup Projects FAKE DEMO] Job created with PROCESSING status:', job.id);
      console.log('📝 [WorldBankGroup Projects FAKE DEMO] Mock analysis data stored in fund record');
      console.log('⏸️  [WorldBankGroup Projects FAKE DEMO] Job will remain in PROCESSING state for demo');
    }

    // Keep status as DRAFT (never becomes ACTIVE for demo)
    const finalStatus = 'DRAFT';

    await prisma.funds.update({
      where: { id: project.id },
      data: { status: finalStatus }
    });

    const hasErrors = failedUploads.length > 0;
    const overallSuccess = successfulUploads.length > 0;

    return NextResponse.json({
      success: overallSuccess,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: finalStatus,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString()
      },
      jobId: job?.id,
      documentsUploaded: successfulUploads.length,
      documentsFailed: failedUploads.length,
      message: hasErrors
        ? `WorldBankGroup project created with ${successfulUploads.length} successful uploads and ${failedUploads.length} failures`
        : `WorldBankGroup project created and ${successfulUploads.length} documents are being processed`,
      warnings: hasErrors ? failedUploads.map((upload: any) => `Failed to upload ${upload.filename}: ${upload.error}`) : [],
      fakeDemo: true,
      demoNote: 'This is a demo environment. Documents uploaded to S3, but AI processing is simulated.'
    });

  } catch (error) {
    console.error('[WorldBankGroup Projects] Error creating project:', error);
    return NextResponse.json(
      {
        error: 'Failed to create WorldBankGroup project',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
