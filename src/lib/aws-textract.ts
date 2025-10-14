/**
 * AWS Textract Service - Extract text from PDF documents (FIXED VERSION)
 *
 * This service uses AWS Textract to extract text content from PDF files stored in S3.
 * Handles both single-page and multi-page PDFs correctly.
 */

import {
  TextractClient,
  DetectDocumentTextCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  DocumentLocation,
  JobStatus
} from '@aws-sdk/client-textract';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from './aws-credentials';

// CRITICAL FIX: Create clients lazily to ensure Lambda execution role is available
// Do NOT initialize at module level as credentials may not be ready during cold start
let textractClient: TextractClient | null = null;
let s3Client: S3Client | null = null;

function getTextractClient(): TextractClient {
  if (!textractClient) {
    console.log('🔐 Creating new Textract client with Lambda execution role credentials');
    textractClient = new TextractClient({
      region: AWS_REGION,
      credentials: getAWSCredentials()
    });
  }
  return textractClient;
}

function getS3Client(): S3Client {
  if (!s3Client) {
    console.log('🔐 Creating new S3 client in aws-textract.ts with Lambda execution role credentials');
    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: getAWSCredentials()
    });
  }
  return s3Client;
}

/**
 * Extract text from a PDF document stored in S3 using AWS Textract
 * Automatically handles single-page vs multi-page PDFs
 */
export async function extractTextFromPDF(s3Key: string): Promise<string> {
  console.log(`📄 Starting Textract extraction for: ${s3Key}`);
  console.log(`📄 Using bucket: ${S3_BUCKET}, region: ${AWS_REGION}`);

  try {
    // First, try synchronous processing (works for single-page PDFs)
    const syncResult = await tryDetectDocumentText(s3Key);
    if (syncResult) {
      return syncResult;
    }

    // If sync fails, use async processing for multi-page PDFs
    console.log(`📄 Single-page processing failed, trying async for multi-page PDF...`);
    return await processMultiPagePDF(s3Key);

  } catch (error) {
    console.error(`📄 Textract extraction failed for ${s3Key}:`, error);

    // CRITICAL: Don't wrap TEXTRACT_ASYNC_PENDING errors - they need to bubble up cleanly
    // so the JobId can be extracted by the error handler in background-job-service.ts
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('TEXTRACT_ASYNC_PENDING:')) {
      throw error; // Re-throw as-is without wrapping
    }

    throw new Error(
      `AWS Textract failed to extract text from PDF: ${errorMessage}`
    );
  }
}

/**
 * Try synchronous text detection (for single-page PDFs)
 */
async function tryDetectDocumentText(s3Key: string): Promise<string | null> {
  try {
    console.log(`📄 Attempting synchronous detection for single-page PDF...`);

    // Download PDF from S3
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key
    });

    const s3Response = await getS3Client().send(getCommand);
    if (!s3Response.Body) {
      throw new Error('No content in S3 object');
    }

    // Convert to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of s3Response.Body as any) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    console.log(`📄 Downloaded ${pdfBuffer.length} bytes, checking if single-page...`);

    // Check PDF page count (simple heuristic based on size)
    // Most single-page PDFs are under 500KB
    if (pdfBuffer.length > 500000) {
      console.log(`📄 PDF likely multi-page (${pdfBuffer.length} bytes), skipping sync detection`);
      return null;
    }

    // Try synchronous detection
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: pdfBuffer
      }
    });

    const response = await getTextractClient().send(command);

    if (!response.Blocks || response.Blocks.length === 0) {
      return null;
    }

    // Extract text from LINE blocks
    const textLines = response.Blocks
      .filter(block => block.BlockType === 'LINE')
      .map(block => block.Text || '')
      .filter(text => text.trim().length > 0);

    const extractedText = textLines.join('\n');

    if (extractedText.trim().length === 0) {
      return null;
    }

    console.log(`📄 Sync extraction successful: ${extractedText.length} characters`);
    return extractedText;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';

    // Expected failures for multi-page PDFs
    if (errorMessage.includes('unsupported document format') ||
        errorMessage.includes('UnsupportedDocumentException') ||
        errorMessage.includes('InvalidParameterException')) {
      console.log(`📄 Sync detection failed (expected for multi-page): ${errorMessage}`);
      return null;
    }

    // Unexpected error - re-throw
    throw error;
  }
}

/**
 * Start async Textract job for multi-page PDF and return JobId immediately
 * Background processor will poll for completion
 */
export async function startTextractJob(s3Key: string): Promise<string> {
  console.log(`📄 Starting async Textract job for multi-page PDF: ${s3Key}`);

  const startCommand = new StartDocumentTextDetectionCommand({
    DocumentLocation: {
      S3Object: {
        Bucket: S3_BUCKET,
        Name: s3Key
      }
    }
  });

  const startResponse = await getTextractClient().send(startCommand);
  const jobId = startResponse.JobId;

  if (!jobId) {
    throw new Error('Failed to start Textract job');
  }

  console.log(`📄 Textract job started: ${jobId} - background processor will poll for completion`);
  return jobId;
}

/**
 * Check status of Textract job
 */
export async function getTextractJobStatus(jobId: string): Promise<{
  status: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL_SUCCESS';
  statusMessage?: string;
}> {
  const getCommand = new GetDocumentTextDetectionCommand({
    JobId: jobId
  });

  const response = await getTextractClient().send(getCommand);

  return {
    status: response.JobStatus || 'IN_PROGRESS',
    statusMessage: response.StatusMessage
  };
}

/**
 * Retrieve text from completed Textract job
 */
export async function getTextractJobResults(jobId: string): Promise<string> {
  console.log(`📄 Retrieving Textract job results: ${jobId}`);

  let allText = '';
  let nextToken: string | undefined = undefined;

  do {
    const getCommand = new GetDocumentTextDetectionCommand({
      JobId: jobId,
      NextToken: nextToken
    });

    const response = await getTextractClient().send(getCommand);

    if (response.JobStatus !== 'SUCCEEDED') {
      throw new Error(`Textract job not complete. Status: ${response.JobStatus}`);
    }

    if (response.Blocks) {
      const textLines = response.Blocks
        .filter(block => block.BlockType === 'LINE')
        .map(block => block.Text || '')
        .filter(text => text.trim().length > 0);
      allText += textLines.join('\n') + '\n';
    }

    nextToken = response.NextToken;
  } while (nextToken);

  const trimmedText = allText.trim();
  console.log(`📄 Textract extraction complete: ${trimmedText.length} characters from job ${jobId}`);

  if (trimmedText.length === 0) {
    throw new Error('PDF appears to be empty or contains only images');
  }

  return trimmedText;
}

/**
 * Process multi-page PDFs using async Textract job (LEGACY - kept for backwards compatibility)
 * New code should use startTextractJob + getTextractJobResults
 */
async function processMultiPagePDF(s3Key: string): Promise<string> {
  // Start job and get JobId
  const jobId = await startTextractJob(s3Key);

  // Poll for completion (limited to avoid Lambda timeout)
  let jobStatus: JobStatus = 'IN_PROGRESS';
  let attempts = 0;
  const maxAttempts = 4; // Only 20 seconds max (4 × 5s) to avoid Lambda timeout

  while (jobStatus === 'IN_PROGRESS' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const status = await getTextractJobStatus(jobId);
    jobStatus = status.status;

    console.log(`📄 Job status: ${jobStatus} (attempt ${attempts + 1}/${maxAttempts})`);
    attempts++;

    if (jobStatus === 'SUCCEEDED') {
      return await getTextractJobResults(jobId);
    }

    if (jobStatus === 'FAILED') {
      throw new Error(`Textract job failed: ${status.statusMessage || 'Unknown error'}`);
    }
  }

  // Job still in progress - throw special error to trigger background polling
  throw new Error(`TEXTRACT_ASYNC_PENDING:${jobId}`);
}


/**
 * Check if a file should be processed with Textract
 */
export function shouldUseTextract(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}