import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sqsService } from '@/lib/sqs-service';
import { ensureStartup } from '@/lib/startup';
import crypto from 'crypto';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from '@/lib/aws-credentials';

const prisma = new PrismaClient();

// S3 client with EXPLICIT IAM role credentials
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: getAWSCredentials(),
});

// POST: Create procurement tender asynchronously with document processing
export async function POST(req: NextRequest) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DEBUG: API Route /api/tenders/create-async called');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Ensure background processor is started in production
    ensureStartup();

    const body = await req.json();
    console.log('📦 DEBUG: Request body keys:', Object.keys(body));
    console.log('📦 DEBUG: Request body structure:', JSON.stringify({
      name: body.name,
      description: body.description,
      moduleType: body.moduleType,
      preRfpFilesCount: body.preRfpFiles?.length || 0,
      rfpFilesCount: body.rfpFiles?.length || 0,
      supportingFilesCount: body.supportingFiles?.length || 0,
      outputTemplatesFilesCount: body.outputTemplatesFiles?.length || 0
    }, null, 2));

    const {
      name,
      description,
      moduleType,
      preRfpFiles = [],
      rfpFiles = [],
      supportingFiles = [],
      outputTemplatesFiles = []
    } = body;

    console.log('🚀 Creating procurement tender:', { name, moduleType, totalFiles: (preRfpFiles?.length || 0) + (rfpFiles?.length || 0) + (supportingFiles?.length || 0) + (outputTemplatesFiles?.length || 0) });

    if (!name) {
      return NextResponse.json(
        { error: 'Tender name is required' },
        { status: 400 }
      );
    }

    // Validate moduleType
    if (moduleType !== 'PROCUREMENT') {
      return NextResponse.json(
        { error: 'Invalid module type. Must be PROCUREMENT for tenders.' },
        { status: 400 }
      );
    }

    // Check if name already exists for PROCUREMENT module
    const existingTender = await prisma.fund.findFirst({
      where: {
        name: name.trim(),
        moduleType: 'PROCUREMENT'
      }
    });

    if (existingTender) {
      return NextResponse.json(
        { error: 'A tender with this name already exists' },
        { status: 409 }
      );
    }

    // Create the procurement tender (project-specific knowledgebase)
    const tender = await prisma.fund.create({
      data: {
        name: name.trim(),
        description: description || null,
        status: 'DRAFT',
        moduleType: 'PROCUREMENT',
        brainVersion: 1
      }
    });

    // Process and upload documents
    const documentUploads = [];

    console.log('📥 Input files:', {
      preRfpFiles: preRfpFiles?.length || 0,
      rfpFiles: rfpFiles?.length || 0,
      supportingFiles: supportingFiles?.length || 0,
      outputTemplatesFiles: outputTemplatesFiles?.length || 0
    });

    // Map 4-step tender files to document types
    const allFiles = [
      ...(preRfpFiles || []).map((f: any) => ({ ...f, documentType: 'APPLICATION_FORM' })), // Pre-RFP docs (business case, etc.)
      ...(rfpFiles || []).map((f: any) => ({ ...f, documentType: 'SELECTION_CRITERIA' })), // RFP document itself
      ...(supportingFiles || []).map((f: any) => ({ ...f, documentType: 'GOOD_EXAMPLES' })), // Supporting RFP docs (rubrics, Q&A)
      ...(outputTemplatesFiles || []).map((f: any) => ({ ...f, documentType: 'OUTPUT_TEMPLATES' })) // Output templates
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

    // Test AWS credentials before uploading files
    try {
      const testCredentials = await s3Client.config.credentials();
      console.log('🔐 DEBUG: AWS credentials resolved successfully:', {
        accessKeyId: testCredentials?.accessKeyId ? `${testCredentials.accessKeyId.substring(0, 8)}...` : 'NONE',
        hasSecretKey: !!testCredentials?.secretAccessKey,
        hasSessionToken: !!testCredentials?.sessionToken
      });
    } catch (credError) {
      console.error('🔐 DEBUG: Failed to resolve AWS credentials:', credError);
      return NextResponse.json(
        {
          error: 'AWS credentials not configured correctly',
          details: credError instanceof Error ? credError.message : String(credError)
        },
        { status: 500 }
      );
    }

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

        // Generate S3 key with tenders/ prefix (not procurement-admin/)
        const documentKey = `tenders/${tender.id}/${crypto.randomUUID()}-${file.filename}`;

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

        const s3Response = await s3Client.send(putObjectCommand);
        console.log(`✅ S3 upload successful for ${file.filename}`, {
          ETag: s3Response.ETag,
          VersionId: s3Response.VersionId
        });

        // Create document record with PROCUREMENT moduleType
        const document = await prisma.fundDocument.create({
          data: {
            fundId: tender.id,
            documentType: file.documentType,
            filename: file.filename,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            s3Key: documentKey,
            moduleType: 'PROCUREMENT' // Critical: PROCUREMENT not PROCUREMENT_ADMIN
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

    // Queue successful documents for processing via SQS (like procurement-admin)
    let job = null;
    if (successfulUploads.length > 0) {
      try {
        job = await sqsService.queueDocumentProcessing(tender.id, successfulUploads.map(doc => ({
          id: doc.documentId,
          s3Key: doc.s3Key,
          documentType: doc.documentType,
          filename: doc.filename,
          mimeType: 'application/pdf' // Will be properly set from file data
        })));
        console.log('✅ SQS job created:', job.id);
      } catch (sqsError) {
        console.error('❌ Failed to create SQS job:', sqsError);
        // Create a placeholder job in the database so frontend has something to track
        job = await prisma.backgroundJob.create({
          data: {
            fundId: tender.id,
            type: 'DOCUMENT_ANALYSIS',
            status: 'FAILED',
            totalDocuments: successfulUploads.length,
            processedDocuments: 0,
            errorMessage: `SQS queue failed: ${sqsError instanceof Error ? sqsError.message : 'Unknown error'}`,
            metadata: {
              documentIds: successfulUploads.map(d => d.documentId),
              failureReason: 'SQS_ERROR'
            },
            moduleType: 'PROCUREMENT'
          }
        });
      }
    }

    // Keep status as DRAFT until brain building completes
    const finalStatus = documentUploads.length > 0 ? 'DRAFT' : 'ACTIVE';

    await prisma.fund.update({
      where: { id: tender.id },
      data: { status: finalStatus }
    });

    // Determine overall success
    const hasErrors = failedUploads.length > 0;
    const overallSuccess = successfulUploads.length > 0;

    return NextResponse.json({
      success: overallSuccess,
      tender: {
        id: tender.id,
        name: tender.name,
        description: tender.description,
        status: finalStatus,
        createdAt: tender.createdAt.toISOString(),
        updatedAt: tender.updatedAt.toISOString()
      },
      jobId: job?.id,
      documentsUploaded: successfulUploads.length,
      documentsFailed: failedUploads.length,
      message: hasErrors
        ? `Tender created with ${successfulUploads.length} successful uploads and ${failedUploads.length} failures`
        : `Tender created and ${successfulUploads.length} documents queued for processing`,
      warnings: hasErrors ? failedUploads.map((upload: any) => `Failed to upload ${upload.filename}: ${upload.error}`) : [],
      debug: {
        inputFiles: {
          preRfpFiles: preRfpFiles?.length || 0,
          rfpFiles: rfpFiles?.length || 0,
          supportingFiles: supportingFiles?.length || 0,
          outputTemplatesFiles: outputTemplatesFiles?.length || 0
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
    console.error('Error creating procurement tender:', error);
    return NextResponse.json(
      {
        error: 'Failed to create procurement tender',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
