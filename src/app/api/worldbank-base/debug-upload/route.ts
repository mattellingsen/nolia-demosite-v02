import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '@/lib/aws-credentials';
import { prisma } from '@/lib/database-s3';
import crypto from 'crypto';

/**
 * DEBUG ENDPOINT - Shows exact errors during worldbank-base document upload
 * Call this instead of create-async to see detailed error messages
 */
export async function POST(req: NextRequest) {
  const debugLog: string[] = [];
  const addLog = (message: string) => {
    console.log(message);
    debugLog.push(`${new Date().toISOString()} - ${message}`);
  };

  try {
    addLog('═══════════════════════════════════════════════════════════');
    addLog('🔍 DEBUG UPLOAD ENDPOINT CALLED');
    addLog('═══════════════════════════════════════════════════════════');

    // Parse JSON body
    const body = await req.json();
    addLog(`📦 Body received: ${JSON.stringify(Object.keys(body))}`);

    const { name, description, policyFiles, complianceFiles, templateFiles, governanceFiles } = body;

    addLog(`📋 Input validation:`);
    addLog(`  - name: ${name || 'MISSING'}`);
    addLog(`  - description: ${description || 'MISSING'}`);
    addLog(`  - policyFiles: ${policyFiles?.length || 0} files`);
    addLog(`  - complianceFiles: ${complianceFiles?.length || 0} files`);
    addLog(`  - templateFiles: ${templateFiles?.length || 0} files`);
    addLog(`  - governanceFiles: ${governanceFiles?.length || 0} files`);

    if (!name) {
      addLog('❌ ERROR: Base name is required');
      return NextResponse.json({
        success: false,
        error: 'Base name is required',
        debugLog
      }, { status: 400 });
    }

    // Check for existing base
    addLog('🔍 Checking for existing base with same name...');
    const existingBase = await prisma.funds.findFirst({
      where: {
        name: name.trim(),
        moduleType: 'WORLDBANK_ADMIN'
      }
    });

    if (existingBase) {
      addLog(`❌ ERROR: Base already exists with ID ${existingBase.id}`);
      return NextResponse.json({
        success: false,
        error: 'A worldbank base with this name already exists',
        debugLog
      }, { status: 409 });
    }
    addLog('✅ No existing base found, proceeding...');

    // Create base
    addLog('📝 Creating base in database...');
    const baseId = crypto.randomUUID();
    addLog(`  - Generated ID: ${baseId}`);

    try {
      await prisma.funds.create({
        data: {
          id: baseId,
          name: name.trim(),
          description: description || null,
          status: 'DRAFT',
          moduleType: 'WORLDBANK_ADMIN',
          brainVersion: 1
        }
      });
      addLog('✅ Base created successfully');
    } catch (createError: any) {
      addLog(`❌ ERROR creating base: ${createError.message}`);
      return NextResponse.json({
        success: false,
        error: `Failed to create base: ${createError.message}`,
        debugLog
      }, { status: 500 });
    }

    // Fetch created base
    const base = await prisma.funds.findUnique({ where: { id: baseId } });
    if (!base) {
      addLog('❌ ERROR: Base was created but cannot be found');
      return NextResponse.json({
        success: false,
        error: 'Base created but not found',
        debugLog
      }, { status: 500 });
    }
    addLog(`✅ Base fetched: ${base.name}`);

    // Process documents
    const allFiles = [
      ...(policyFiles || []).map((f: any) => ({ ...f, documentType: 'POLICY_DOCUMENT' })),
      ...(complianceFiles || []).map((f: any) => ({ ...f, documentType: 'COMPLIANCE_STANDARD' })),
      ...(templateFiles || []).map((f: any) => ({ ...f, documentType: 'PROCUREMENT_TEMPLATE' })),
      ...(governanceFiles || []).map((f: any) => ({ ...f, documentType: 'PROCUREMENT_RULE' }))
    ];

    addLog(`📁 Total files to process: ${allFiles.length}`);

    const uploadedDocuments: any[] = [];
    const failedUploads: any[] = [];

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      addLog(`\n📄 [${i + 1}/${allFiles.length}] Processing: ${file.filename}`);

      try {
        // Validate file
        if (!file.content) {
          throw new Error('File missing content property');
        }
        if (!file.filename) {
          throw new Error('File missing filename property');
        }
        addLog(`  ✓ File validation passed`);

        // Generate S3 key
        const documentKey = `worldbank-admin/${base.id}/${crypto.randomUUID()}-${file.filename}`;
        addLog(`  ✓ S3 key: ${documentKey}`);

        // Convert base64 to buffer
        let fileBuffer: Buffer;
        try {
          fileBuffer = Buffer.from(file.content, 'base64');
          addLog(`  ✓ Converted to buffer: ${fileBuffer.length} bytes`);
        } catch (bufferError: any) {
          throw new Error(`Failed to convert base64: ${bufferError.message}`);
        }

        // Upload to S3
        addLog(`  📤 Uploading to S3...`);
        const putObjectCommand = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_DOCUMENTS!,
          Key: documentKey,
          Body: fileBuffer,
          ContentType: file.mimeType,
        });

        const s3Response = await getS3Client().send(putObjectCommand);
        addLog(`  ✅ S3 upload success (ETag: ${s3Response.ETag})`);

        // Create database record
        addLog(`  💾 Creating database record...`);
        const document = await prisma.fund_documents.create({
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
        addLog(`  ✅ Database record created (ID: ${document.id})`);

        uploadedDocuments.push({
          documentId: document.id,
          filename: file.filename,
          documentType: file.documentType
        });

      } catch (uploadError: any) {
        addLog(`  ❌ FAILED: ${uploadError.message}`);
        failedUploads.push({
          filename: file.filename,
          error: uploadError.message,
          stack: uploadError.stack
        });
      }
    }

    addLog(`\n═══════════════════════════════════════════════════════════`);
    addLog(`📊 UPLOAD SUMMARY:`);
    addLog(`  ✅ Successful: ${uploadedDocuments.length}`);
    addLog(`  ❌ Failed: ${failedUploads.length}`);
    addLog(`═══════════════════════════════════════════════════════════`);

    return NextResponse.json({
      success: true,
      message: 'Debug upload completed',
      baseId: base.id,
      uploadSummary: {
        total: allFiles.length,
        successful: uploadedDocuments.length,
        failed: failedUploads.length
      },
      uploadedDocuments,
      failedUploads,
      debugLog
    });

  } catch (error: any) {
    addLog(`\n❌ FATAL ERROR: ${error.message}`);
    addLog(`Stack trace: ${error.stack}`);

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      debugLog
    }, { status: 500 });
  }
}
