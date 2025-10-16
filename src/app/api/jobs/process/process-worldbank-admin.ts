/**
 * Worldbank-Admin Module Document Processing
 *
 * Processes POLICY_DOCUMENT, PROCUREMENT_RULE, COMPLIANCE_STANDARD, and PROCUREMENT_TEMPLATE
 * documents for the worldbank-admin module (global procurement knowledge base).
 *
 * Architecture: Uses same infrastructure as funding (Textract, chunking, progress tracking)
 * but with procurement-focused Claude analysis prompts.
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/database-s3';
import { extractTextFromFile } from '@/utils/server-document-analyzer';
import { AWS_REGION, S3_BUCKET, getAWSCredentials } from '@/lib/aws-credentials';
import {
  analyzePolicyDocument,
  analyzeProcurementRuleDocument,
  analyzeComplianceStandardDocument,
  analyzeProcurementTemplateDocument,
} from '@/lib/claude-worldbank-admin';

// S3 client (lazy initialization)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    console.log('🔐 Creating new S3 client with Lambda execution role credentials');
    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: getAWSCredentials(),
    });
  }
  return s3Client;
}

/**
 * Process a worldbank-admin document
 *
 * Flow:
 * 1. Check for pre-extracted text (from Textract async jobs)
 * 2. If not available, extract now (sync or async Textract)
 * 3. Call module-specific Claude analysis with chunking + progress tracking
 * 4. Save analysis results to database
 */
export async function processWorldbankAdminDocument(
  document: any,
  jobMetadata?: any,
  jobId?: string
): Promise<any> {
  const startTime = Date.now();
  console.log(`⏱️  Processing worldbank-admin document: ${document.filename} (${document.documentType})`);

  // Progress tracking helper for chunked analysis
  const updateChunkProgress = async (currentChunk: number, totalChunks: number) => {
    if (!jobId) return;

    try {
      console.log(`📊 Chunk progress: ${currentChunk}/${totalChunks} (${Math.round(currentChunk/totalChunks*100)}%)`);

      const currentJob = await prisma.background_jobs.findUnique({
        where: { id: jobId }
      });

      if (currentJob) {
        const currentMetadata = currentJob.metadata as any || {};

        await prisma.background_jobs.update({
          where: { id: jobId },
          data: {
            metadata: {
              ...currentMetadata,
              chunkProgress: {
                documentId: document.id,
                documentFilename: document.filename,
                currentChunk,
                totalChunks,
                percentage: Math.round(currentChunk/totalChunks*100),
                lastUpdated: new Date().toISOString()
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('⚠️ Failed to update chunk progress (non-critical):', error);
    }
  };

  // Check if Textract already extracted text (from async job)
  const textractJobs = jobMetadata?.textractJobs || {};
  const textractJob = textractJobs[document.id];

  let preExtractedText: string | null = null;
  if (textractJob?.status === 'SUCCEEDED' && textractJob.extractedText) {
    console.log(`📄 Using pre-extracted Textract text for ${document.filename} (${textractJob.textLength} chars)`);
    preExtractedText = textractJob.extractedText;
  }

  // Download document from S3
  const getCommand = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: document.s3Key
  });

  const s3Response = await getS3Client().send(getCommand);
  const documentBuffer = Buffer.from(await s3Response.Body!.transformToByteArray());

  // Create File-like object for analysis functions
  const fileObject = {
    arrayBuffer: async () => documentBuffer.buffer,
    name: document.filename,
    type: document.mimeType,
    size: document.fileSize
  };

  let analysisResult;

  // Process based on worldbank-admin document type
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Extract text (use pre-extracted if available, otherwise extract now)
    let textContent: string;
    if (preExtractedText) {
      console.log(`📄 Using pre-extracted text for ${document.filename} (${preExtractedText.length} chars)`);
      textContent = preExtractedText;
    } else {
      console.log(`📄 TEXTRACT: Starting text extraction for ${document.filename}`);
      console.log(`📄 S3 Key: ${document.s3Key}`);
      console.log(`📄 Document Type: ${document.documentType}`);
      textContent = await extractTextFromFile(fileObject as File, document.s3Key);
      console.log(`✅ TEXTRACT: Extracted ${textContent.length} characters`);
    }

    console.log(`✅ Text preview: ${textContent.substring(0, 200)}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Route to appropriate Claude analysis function based on document type
    switch (document.documentType) {
      case 'POLICY_DOCUMENT':
        console.log('🧠 Analyzing POLICY_DOCUMENT with Claude AI...');
        analysisResult = await analyzePolicyDocument(
          textContent,
          document.filename,
          updateChunkProgress
        );
        analysisResult.analysisMode = 'CLAUDE_AI';
        console.log('✅ POLICY_DOCUMENT analysis complete');

        // Save to database
        await prisma.funds.update({
          where: { id: document.fundId },
          data: {
            policyDocumentAnalysis: analysisResult
          }
        });
        break;

      case 'PROCUREMENT_RULE':
        console.log('🧠 Analyzing PROCUREMENT_RULE with Claude AI...');
        analysisResult = await analyzeProcurementRuleDocument(
          textContent,
          document.filename,
          updateChunkProgress
        );
        analysisResult.analysisMode = 'CLAUDE_AI';
        console.log('✅ PROCUREMENT_RULE analysis complete');

        // Save to database
        await prisma.funds.update({
          where: { id: document.fundId },
          data: {
            procurementRuleAnalysis: analysisResult
          }
        });
        break;

      case 'COMPLIANCE_STANDARD':
        console.log('🧠 Analyzing COMPLIANCE_STANDARD with Claude AI...');
        analysisResult = await analyzeComplianceStandardDocument(
          textContent,
          document.filename,
          updateChunkProgress
        );
        analysisResult.analysisMode = 'CLAUDE_AI';
        console.log('✅ COMPLIANCE_STANDARD analysis complete');

        // Save to database
        await prisma.funds.update({
          where: { id: document.fundId },
          data: {
            complianceStandardAnalysis: analysisResult
          }
        });
        break;

      case 'PROCUREMENT_TEMPLATE':
        console.log('🧠 Analyzing PROCUREMENT_TEMPLATE with Claude AI...');
        analysisResult = await analyzeProcurementTemplateDocument(
          textContent,
          document.filename
          // Templates usually smaller, no progress tracking needed
        );
        analysisResult.analysisMode = 'CLAUDE_AI';
        console.log('✅ PROCUREMENT_TEMPLATE analysis complete');

        // Save to database
        await prisma.funds.update({
          where: { id: document.fundId },
          data: {
            procurementTemplateAnalysis: analysisResult
          }
        });
        break;

      default:
        throw new Error(
          `Unknown worldbank-admin document type: ${document.documentType}\n` +
          `Expected one of: POLICY_DOCUMENT, PROCUREMENT_RULE, COMPLIANCE_STANDARD, PROCUREMENT_TEMPLATE\n` +
          `Fund ID: ${document.fundId} | Document: ${document.filename}`
        );
    }

  } catch (error) {
    console.error(`❌ Worldbank-admin document processing failed for ${document.filename}:`, error);

    // CRITICAL: Don't wrap TEXTRACT_ASYNC_PENDING errors - they need to bubble up cleanly
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('TEXTRACT_ASYNC_PENDING:')) {
      throw error; // Re-throw as-is without wrapping
    }

    throw new Error(`Worldbank-admin document processing failed for "${document.filename}": ${errorMessage}`);
  }

  const endTime = Date.now();
  const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
  const durationMinutes = (parseFloat(durationSeconds) / 60).toFixed(2);
  console.log(`⏱️  Completed processing ${document.filename}: ${document.documentType}`);
  console.log(`⏱️  Processing time: ${durationSeconds}s (${durationMinutes} minutes)`);

  return analysisResult;
}
