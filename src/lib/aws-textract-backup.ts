/**
 * AWS Textract Service - Extract text from PDF documents
 *
 * This service uses AWS Textract to extract text content from PDF files stored in S3.
 * Textract is a managed OCR service that handles complex PDFs including:
 * - Multi-column layouts
 * - Tables and forms
 * - Scanned documents (images)
 * - Mixed text and graphics
 */

import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from './aws-credentials';

// Initialize Textract client with proper credentials
const textractClient = new TextractClient({
  region: AWS_REGION,
  credentials: getAWSCredentials()
});

// Initialize S3 client for downloading PDFs
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: getAWSCredentials()
});

/**
 * Extract text from a PDF document stored in S3 using AWS Textract
 *
 * Uses inline document upload instead of S3 reference to avoid cross-service permissions
 *
 * @param s3Key - The S3 object key (path) to the PDF file
 * @returns Extracted text content
 */
export async function extractTextFromPDF(s3Key: string): Promise<string> {
  console.log(`📄 Starting Textract extraction for: ${s3Key}`);
  console.log(`📄 Using bucket: ${S3_BUCKET}, region: ${AWS_REGION}`);

  try {
    // Step 1: Download PDF from S3
    console.log(`📄 Downloading PDF from S3...`);
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key
    });

    const s3Response = await s3Client.send(getCommand);

    if (!s3Response.Body) {
      throw new Error('No content in S3 object');
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of s3Response.Body as any) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    console.log(`📄 Downloaded ${pdfBuffer.length} bytes, sending to Textract...`);

    // Step 2: Send PDF bytes directly to Textract (avoids S3 cross-service permissions)
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: pdfBuffer
      }
    });

    console.log(`📄 Sending Textract request with inline document...`);
    const response = await textractClient.send(command);

    if (!response.Blocks || response.Blocks.length === 0) {
      console.warn(`📄 Textract returned no blocks for ${s3Key}`);
      throw new Error('PDF appears to be empty or contains no extractable text');
    }

    // Extract text from LINE blocks (preserves reading order and line breaks)
    const textLines = response.Blocks
      .filter(block => block.BlockType === 'LINE')
      .map(block => block.Text || '')
      .filter(text => text.trim().length > 0);

    const extractedText = textLines.join('\n');

    console.log(`📄 Textract extraction successful!`);
    console.log(`📄 Extracted ${extractedText.length} characters from ${textLines.length} lines`);
    console.log(`📄 First 200 characters: ${extractedText.substring(0, 200)}`);

    if (extractedText.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains only images without text');
    }

    return extractedText;

  } catch (error) {
    console.error(`📄 Textract extraction failed for ${s3Key}:`, error);

    // Check if this is an "unsupported document format" error - if so, try fallback
    const errorMessage = error instanceof Error ? error.message : '';

    // Common Textract errors that warrant fallback
    const fallbackErrors = [
      'unsupported document format',
      'UnsupportedDocumentException',
      'InvalidParameterException',  // Often means multi-page PDF
      'Request has unsupported document format',  // Exact error from the logs
      'Document is too large',
      'BadDocumentException'
    ];

    const shouldFallback = fallbackErrors.some(err =>
      errorMessage.toLowerCase().includes(err.toLowerCase())
    );

    if (shouldFallback) {
      console.log(`⚠️  Textract doesn't support this PDF format (likely multi-page or complex), falling back to alternative extraction...`);
      console.log(`⚠️  Original Textract error: ${errorMessage}`);

      try {
        // We already have the pdfBuffer from the first attempt
        const pdfBuffer = await (async () => {
          const getCommand = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key
          });
          const s3Response = await s3Client.send(getCommand);
          const chunks: Buffer[] = [];
          for await (const chunk of s3Response.Body as any) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks);
        })();

        // Use improved fallback extraction
        const text = await extractTextWithPdfJs(pdfBuffer);
        console.log(`✅ Fallback extraction successful: extracted ${text.length} characters`);
        return text;

      } catch (fallbackError) {
        console.error(`❌ Fallback extraction also failed:`, fallbackError);
        throw new Error(
          `Both Textract and fallback methods failed to extract text from PDF. ` +
          `Textract error: ${errorMessage}. ` +
          `Fallback error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}. ` +
          `The PDF might be corrupted, password-protected, or contain only images without text.`
        );
      }
    }

    // For other errors, provide helpful messages
    if (error instanceof Error) {
      if (error.message.includes('AccessDenied')) {
        throw new Error(
          `AWS Textract access denied. Please ensure the IAM role has Textract permissions. ` +
          `Original error: ${error.message}`
        );
      }

      if (error.message.includes('NoSuchKey')) {
        throw new Error(
          `PDF file not found in S3 at key: ${s3Key}. ` +
          `Please ensure the file was uploaded successfully.`
        );
      }

      if (error.message.includes('InvalidS3ObjectException')) {
        throw new Error(
          `Invalid PDF file or corrupted document at ${s3Key}. ` +
          `Please ensure the file is a valid PDF.`
        );
      }
    }

    throw new Error(
      `AWS Textract failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract text from PDF buffer using pdf-parse (more reliable in Node.js/serverless)
 */
async function extractTextWithPdfJs(pdfBuffer: Buffer): Promise<string> {
  console.log(`📄 Using fallback PDF extraction method...`);

  try {
    // First, try pdf-parse which is more reliable in Node.js environments
    const pdfParse = await import('pdf-parse');
    const pdfData = await pdfParse.default(pdfBuffer);

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no extractable text');
    }

    console.log(`✅ pdf-parse extraction successful: ${pdfData.text.length} characters`);
    console.log(`📄 PDF info: ${pdfData.numpages} pages, version ${pdfData.info?.PDFFormatVersion}`);

    return pdfData.text.trim();

  } catch (pdfParseError) {
    console.error('❌ pdf-parse failed, trying pdf.js:', pdfParseError);

    // Fallback to pdf.js with Node.js configuration
    try {
      // Import the Node.js compatible version (not .mjs)
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');

      // Disable workers for Node.js environment to avoid worker loading issues
      pdfjsLib.GlobalWorkerOptions.workerSrc = false;
      pdfjsLib.GlobalWorkerOptions.workerPort = null;

      // Load the PDF document with Node.js specific options
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBuffer),
        useSystemFonts: true,
        useWorkerFetch: false,
        isEvalSupported: false,
        disableFontFace: true
      });

      const pdf = await loadingTask.promise;
      let fullText = '';

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      const trimmedText = fullText.trim();

      if (!trimmedText || trimmedText.length === 0) {
        throw new Error('PDF appears to be empty or contains no extractable text (images only)');
      }

      console.log(`✅ pdf.js extraction successful: ${trimmedText.length} characters`);
      return trimmedText;

    } catch (pdfjsError) {
      console.error('❌ pdf.js also failed:', pdfjsError);
      throw new Error(`All PDF extraction methods failed: ${pdfjsError instanceof Error ? pdfjsError.message : 'Unknown error'}`);
    }
  }
}

/**
 * Check if a file should be processed with Textract
 *
 * @param mimeType - The MIME type of the file
 * @returns true if file is a PDF that should use Textract
 */
export function shouldUseTextract(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}
