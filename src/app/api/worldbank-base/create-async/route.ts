import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sqsService } from '@/lib/sqs-service';
import { ensureStartup } from '@/lib/startup';
import crypto from 'crypto';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from '@/lib/aws-credentials';

const prisma = new PrismaClient();

// CRITICAL FIX: Create S3 client lazily to ensure Lambda execution role is available
// Do NOT initialize at module level as credentials may not be ready during cold start
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    console.log('🔐 Creating new S3 client with Lambda execution role credentials');

    // CRITICAL: In production, DO NOT pass credentials property
    // Let SDK use Lambda execution role automatically
    // Only pass credentials in development
    const credentials = getAWSCredentials();

    s3Client = new S3Client({
      region: AWS_REGION,
      ...(credentials && { credentials }), // Only add credentials if defined
    });

    console.log('✅ S3 client created successfully');
  }
  return s3Client;
}

// POST: Create worldbank base asynchronously with document processing
export async function POST(req: NextRequest) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DEBUG: API Route /api/worldbank-base/create-async called');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Ensure background processor is started in production
    ensureStartup();

    const body = await req.json();
    console.log('📦 DEBUG: Request body keys:', Object.keys(body));
    console.log('📦 DEBUG: Request body structure:', JSON.stringify({
      name: body.name,
      description: body.description,
      moduleType: body.moduleType,
      policyFilesCount: body.policyFiles?.length || 0,
      complianceFilesCount: body.complianceFiles?.length || 0,
      templateFilesCount: body.templateFiles?.length || 0,
      governanceFilesCount: body.governanceFiles?.length || 0
    }, null, 2));

    const {
      name,
      description,
      moduleType,
      policyFiles = [],
      complianceFiles = [],
      templateFiles = [],
      governanceFiles = []
    } = body;

    console.log('🚀 Creating worldbank base:', { name, moduleType, totalFiles: (policyFiles?.length || 0) + (complianceFiles?.length || 0) + (templateFiles?.length || 0) + (governanceFiles?.length || 0) });

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
        moduleType: 'WORLDBANK_ADMIN'
      }
    });

    if (existingBase) {
      return NextResponse.json(
        { error: 'A worldbank base with this name already exists' },
        { status: 409 }
      );
    }

    // Create the worldbank base
    const base = await prisma.fund.create({
      data: {
        name: name.trim(),
        description: description || null,
        status: 'DRAFT',
        moduleType: 'WORLDBANK_ADMIN',
        brainVersion: 1
      }
    });

    // Process and upload documents
    const documentUploads = [];

    console.log('📥 Input files:', {
      policyFiles: policyFiles?.length || 0,
      complianceFiles: complianceFiles?.length || 0,
      templateFiles: templateFiles?.length || 0,
      governanceFiles: governanceFiles?.length || 0
    });

    const allFiles = [
      ...(policyFiles || []).map((f: any) => ({ ...f, documentType: 'APPLICATION_FORM' })), // Reuse enum
      ...(complianceFiles || []).map((f: any) => ({ ...f, documentType: 'SELECTION_CRITERIA' })),
      ...(templateFiles || []).map((f: any) => ({ ...f, documentType: 'GOOD_EXAMPLES' })),
      ...(governanceFiles || []).map((f: any) => ({ ...f, documentType: 'OUTPUT_TEMPLATES' }))
    ];

    console.log('📋 Processed file array:', allFiles?.length || 0, 'files');
    if (allFiles.length > 0) {
      console.log('📄 First file sample:', {
        filename: allFiles[0]?.filename,
        hasContent: !!allFiles[0]?.content,
        documentType: allFiles[0]?.documentType
      });
    }

    console.log(`📁 Processing ${allFiles.length} files for upload`);

    // DEBUG: Log AWS credentials being used
    console.log('🔐 DEBUG: Checking AWS SDK credentials...');
    console.log('🔐 DEBUG: NODE_ENV:', process.env.NODE_ENV);
    console.log('🔐 DEBUG: AWS_REGION:', AWS_REGION);
    console.log('🔐 DEBUG: S3_BUCKET:', S3_BUCKET);
    console.log('🔐 DEBUG: S3_BUCKET_DOCUMENTS:', process.env.S3_BUCKET_DOCUMENTS);

    for (const file of allFiles) {
      try {
        console.log(`📄 Processing file: ${file.filename} (${file.documentType})`);
        console.log(`📄 DEBUG: File properties:`, {
          filename: file.filename,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          hasContent: !!file.content,
          contentLength: file.content?.length || 0,
          contentPreview: file.content ? `${file.content.substring(0, 50)}...` : 'NONE'
        });

        // Validate file has required properties
        if (!file.content) {
          console.error(`❌ File ${file.filename} missing content property`);
          continue;
        }

        if (!file.filename) {
          console.error(`❌ File missing filename property`);
          continue;
        }

        // Generate S3 key
        const documentKey = `worldbank-admin/${base.id}/${crypto.randomUUID()}-${file.filename}`;

        // Convert base64 to buffer
        let fileBuffer;
        try {
          fileBuffer = Buffer.from(file.content, 'base64');
          console.log(`📤 DEBUG: Converted to buffer, size: ${fileBuffer.length} bytes`);
        } catch (bufferError) {
          console.error(`❌ DEBUG: Failed to convert base64 to buffer:`, bufferError);
          throw bufferError;
        }

        console.log(`📤 Uploading ${file.filename} to S3 key: ${documentKey}`);
        console.log(`📤 DEBUG: S3 PutObject params:`, {
          Bucket: process.env.S3_BUCKET_DOCUMENTS,
          Key: documentKey,
          BodySize: fileBuffer.length,
          ContentType: file.mimeType
        });

        // Upload to S3
        const putObjectCommand = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_DOCUMENTS!,
          Key: documentKey,
          Body: fileBuffer,
          ContentType: file.mimeType,
        });

        const s3Response = await getS3Client().send(putObjectCommand);
        console.log(`✅ S3 upload successful for ${file.filename}`, {
          ETag: s3Response.ETag,
          VersionId: s3Response.VersionId
        });

        // Create document record
        const document = await prisma.fundDocument.create({
          data: {
            fundId: base.id,
            documentType: file.documentType,
            filename: file.filename,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            s3Key: documentKey,
            moduleType: 'WORLDBANK_ADMIN'
          }
        });

        console.log(`✅ Database record created for ${file.filename} (ID: ${document.id})`);

        documentUploads.push({
          documentId: document.id,
          filename: file.filename,
          s3Key: documentKey,
          documentType: file.documentType
        });

      } catch (uploadError) {
        console.error(`❌ Error uploading document ${file.filename}:`, uploadError);

        // Store error for debugging
        (documentUploads as any[]).push({
          documentId: 'error',
          filename: file.filename,
          s3Key: 'error',
          documentType: file.documentType,
          error: uploadError instanceof Error ? uploadError.message : String(uploadError)
        });

        // Continue with other documents rather than failing completely
      }
    }

    // Handle failed uploads vs successful uploads separately
    const successfulUploads = documentUploads.filter((upload: any) => upload.documentId !== 'error');
    const failedUploads = documentUploads.filter((upload: any) => upload.documentId === 'error');

    console.log(`📊 Upload summary: ${successfulUploads.length} successful, ${failedUploads.length} failed`);

    // Queue successful documents for processing via SQS (like funding system)
    let job = null;
    if (successfulUploads.length > 0) {
      try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 ABOUT TO QUEUE DOCUMENTS FOR SQS PROCESSING');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📦 Base ID:', base.id);
        console.log('📦 Successful uploads count:', successfulUploads.length);
        console.log('📦 Documents to queue:', successfulUploads.map(d => d.filename).join(', '));
        console.log('🔐 AWS Credentials status: (will be logged by getAWSCredentials)');
        console.log('📍 About to call sqsService.queueDocumentProcessing()...');

        job = await sqsService.queueDocumentProcessing(base.id, successfulUploads.map(doc => ({
          id: doc.documentId,
          s3Key: doc.s3Key,
          documentType: doc.documentType,
          filename: doc.filename,
          mimeType: 'application/pdf' // Will be properly set from file data
        })));

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ SQS JOB CREATED SUCCESSFULLY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Job ID:', job.id);
        console.log('✅ Job Type:', job.type);
        console.log('✅ Job Status:', job.status);
        console.log('✅ Total Documents:', job.totalDocuments);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } catch (sqsError) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ SQS JOB CREATION FAILED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ Error type:', sqsError?.constructor?.name);
        console.error('❌ Error message:', sqsError instanceof Error ? sqsError.message : String(sqsError));
        console.error('❌ Error stack:', sqsError instanceof Error ? sqsError.stack : 'No stack trace');
        console.error('❌ Full error object:', JSON.stringify(sqsError, Object.getOwnPropertyNames(sqsError), 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Create a placeholder job in the database so frontend has something to track
        job = await prisma.backgroundJob.create({
          data: {
            fundId: base.id,
            type: 'DOCUMENT_ANALYSIS',
            status: 'FAILED',
            totalDocuments: successfulUploads.length,
            processedDocuments: 0,
            errorMessage: `SQS queue failed: ${sqsError instanceof Error ? sqsError.message : 'Unknown error'}`,
            metadata: {
              documentIds: successfulUploads.map(d => d.documentId),
              failureReason: 'SQS_ERROR',
              fullError: JSON.stringify(sqsError, Object.getOwnPropertyNames(sqsError))
            },
            moduleType: 'WORLDBANK_ADMIN'
          }
        });
        console.log('📝 Created FAILED job in database as fallback:', job.id);
      }
    }

    // Keep status as DRAFT until brain building completes
    const finalStatus = documentUploads.length > 0 ? 'DRAFT' : 'ACTIVE';

    await prisma.fund.update({
      where: { id: base.id },
      data: { status: finalStatus }
    });

    // Determine overall success
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
        ? `Worldbank base created with ${successfulUploads.length} successful uploads and ${failedUploads.length} failures`
        : `Worldbank base created and ${successfulUploads.length} documents queued for processing`,
      warnings: hasErrors ? failedUploads.map((upload: any) => `Failed to upload ${upload.filename}: ${upload.error}`) : [],
      debug: {
        inputFiles: {
          policyFiles: policyFiles?.length || 0,
          complianceFiles: complianceFiles?.length || 0,
          templateFiles: templateFiles?.length || 0,
          governanceFiles: governanceFiles?.length || 0
        },
        allFilesLength: allFiles.length,
        documentUploadsLength: documentUploads.length,
        successfulUploads: successfulUploads.length,
        failedUploads: failedUploads.length,
        uploads: documentUploads.map((upload: any) => ({
          filename: upload.filename,
          documentType: upload.documentType,
          status: upload.documentId === 'error' ? 'error' : 'success',
          error: upload.error || null
        }))
      }
    });

  } catch (error) {
    console.error('Error creating worldbank base:', error);
    return NextResponse.json(
      {
        error: 'Failed to create worldbank base',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
