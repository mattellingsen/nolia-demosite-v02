import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/database-s3';
import { sqsService } from '@/lib/sqs-service';
import { analyzeApplicationForm, analyzeSelectionCriteria, extractTextFromFile } from '@/utils/server-document-analyzer';
import { BackgroundJobService } from '@/lib/background-job-service';
import { JobStatus, JobType } from '@prisma/client';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from '@/lib/aws-credentials';

// CRITICAL FIX: Create S3 client lazily to ensure Lambda execution role is available
// Do NOT initialize at module level as credentials may not be ready during cold start
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    console.log('🔐 Creating new S3 client with Lambda execution role credentials');
    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: getAWSCredentials(), // Returns undefined in production to use Lambda role
    });
  }
  return s3Client;
}

/**
 * Simulate document processing from SQS queue
 * In production, this would be a Lambda function triggered by SQS
 */
export async function POST(request: NextRequest) {
  try {
    const { jobId, documentId, force = false, autoTrigger = false, retry = false, callerContext } = await request.json();

    // Handle retry request
    if (retry && jobId) {
      console.log(`🔄 Retrying failed job: ${jobId}`);

      try {
        const retriedJob = await sqsService.retryFailedJob(jobId);

        return NextResponse.json({
          success: true,
          message: `Job ${jobId} reset for retry`,
          job: {
            id: retriedJob.id,
            status: 'PENDING',
            retryAt: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error(`Failed to retry job ${jobId}:`, error);
        return NextResponse.json({
          error: 'Failed to retry job',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 });
      }
    }

    if (autoTrigger) {
      console.log('🤖 Background processor triggered job processing');
    }

    if (!jobId && !documentId && !force) {
      return NextResponse.json({
        error: 'Either jobId, documentId, or force=true is required'
      }, { status: 400 });
    }

    let processedJobs = 0;
    let processedDocuments = 0;

    if (force) {
      // Process all pending document analysis jobs
      const pendingJobs = await prisma.backgroundJob.findMany({
        where: {
          type: JobType.DOCUMENT_ANALYSIS,
          status: {
            in: [JobStatus.PENDING, JobStatus.PROCESSING]
          }
        },
        include: {
          fund: {
            include: {
              documents: true
            }
          }
        }
      });

      for (const job of pendingJobs) {
        try {
          const result = await processDocumentAnalysisJob(job, callerContext);
          processedJobs++;
          processedDocuments += result.documentsProcessed;
        } catch (error) {
          console.error(`Failed to process job ${job.id}:`, error);
          await sqsService.markJobFailed(job.id, error instanceof Error ? error.message : 'Unknown error');
        }
      }

    } else if (jobId) {
      // Process specific job
      const job = await prisma.backgroundJob.findUnique({
        where: { id: jobId },
        include: {
          fund: {
            include: {
              documents: true
            }
          }
        }
      });

      if (!job) {
        return NextResponse.json({
          error: 'Job not found'
        }, { status: 404 });
      }

      const result = await processDocumentAnalysisJob(job, callerContext);
      processedJobs = 1;
      processedDocuments = result.documentsProcessed;

    } else if (documentId) {
      // Process specific document
      const document = await prisma.fundDocument.findUnique({
        where: { id: documentId },
        include: {
          fund: true
        }
      });

      if (!document) {
        return NextResponse.json({
          error: 'Document not found'
        }, { status: 404 });
      }

      await processDocument(document);
      processedDocuments = 1;
    }

    return NextResponse.json({
      success: true,
      processedJobs,
      processedDocuments,
      message: `Processed ${processedJobs} jobs and ${processedDocuments} documents`
    });

  } catch (error) {
    console.error('Error processing jobs:', error);
    return NextResponse.json({
      error: 'Failed to process jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processDocumentAnalysisJob(job: any, callerContext?: any) {
  console.log(`Processing document analysis job: ${job.id}`);

  // CRITICAL: Atomic job claiming with distributed lock
  // Refresh the job record to check current status before attempting to claim it
  const currentJob = await prisma.backgroundJob.findUnique({
    where: { id: job.id }
  });

  if (!currentJob) {
    console.log(`⚠️ Job ${job.id} no longer exists - skipping`);
    return { documentsProcessed: 0 };
  }

  // If job was recently updated (within last 5 seconds), another instance is actively processing it
  // EXCEPTION: Allow processing if called from textract-poller (it JUST updated metadata to signal completion)
  const recentlyUpdated = currentJob.updatedAt &&
    (Date.now() - new Date(currentJob.updatedAt).getTime() < 5000);

  const isFromTextractPoller = callerContext?.source === 'textract-poller-resume';

  if (currentJob.status === JobStatus.PROCESSING && recentlyUpdated && !isFromTextractPoller) {
    console.log(`⚠️ Job ${job.id} is actively being processed (updated ${Math.floor((Date.now() - new Date(currentJob.updatedAt).getTime()) / 1000)}s ago) - skipping`);
    return { documentsProcessed: 0 };
  }

  if (isFromTextractPoller) {
    console.log(`✅ Job ${job.id} triggered by textract-poller - bypassing recently-updated check`);
  }

  // Claim the job atomically - update updatedAt as our lock timestamp
  try {
    await prisma.backgroundJob.update({
      where: {
        id: job.id,
        updatedAt: currentJob.updatedAt // Only succeed if updatedAt hasn't changed (optimistic locking)
      },
      data: {
        status: JobStatus.PROCESSING,
        startedAt: currentJob.startedAt || new Date(),
        updatedAt: new Date() // This acts as our distributed lock timestamp
      }
    });
    console.log(`✅ Job ${job.id} claimed and marked as PROCESSING`);
  } catch (error) {
    // If update fails, another Lambda already claimed this job - exit gracefully
    console.log(`⚠️ Job ${job.id} already being processed by another Lambda instance (optimistic lock failed) - skipping`);
    return { documentsProcessed: 0 };
  }

  // CRITICAL: Check for pending Textract jobs and poll for completion
  const jobMetadata = job.metadata as any;
  const textractJobs = jobMetadata?.textractJobs || {};

  if (Object.keys(textractJobs).length > 0) {
    console.log(`🔍 Found ${Object.keys(textractJobs).length} Textract job(s) to check...`);
    const { getTextractJobStatus, getTextractJobResults } = await import('@/lib/aws-textract');

    let hasUpdates = false;
    const updatedTextractJobs = { ...textractJobs };

    for (const [docId, textractJob] of Object.entries(textractJobs) as [string, any][]) {
      if (textractJob.status === 'IN_PROGRESS') {
        try {
          console.log(`📄 Checking Textract job ${textractJob.jobId} for ${textractJob.filename}...`);
          const status = await getTextractJobStatus(textractJob.jobId);

          if (status.status === 'SUCCEEDED') {
            console.log(`✅ Textract job ${textractJob.jobId} completed! Retrieving results...`);
            const extractedText = await getTextractJobResults(textractJob.jobId);

            updatedTextractJobs[docId] = {
              ...textractJob,
              status: 'SUCCEEDED',
              completedAt: new Date().toISOString(),
              extractedText: extractedText,
              textLength: extractedText.length
            };

            hasUpdates = true;
            console.log(`✅ Extracted ${extractedText.length} characters from ${textractJob.filename}`);
          } else if (status.status === 'FAILED') {
            console.error(`❌ Textract job ${textractJob.jobId} failed: ${status.statusMessage}`);
            updatedTextractJobs[docId] = {
              ...textractJob,
              status: 'FAILED',
              completedAt: new Date().toISOString(),
              errorMessage: status.statusMessage
            };
            hasUpdates = true;
          } else {
            console.log(`⏳ Textract job ${textractJob.jobId} still in progress (${status.status})`);
          }
        } catch (error) {
          console.error(`❌ Error checking Textract job ${textractJob.jobId}:`, error);
        }
      }
    }

    // If any Textract jobs completed, update metadata
    if (hasUpdates) {
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          metadata: {
            ...jobMetadata,
            textractJobs: updatedTextractJobs
          }
        }
      });
      console.log(`✅ Updated Textract job statuses in metadata`);
    }

    // If there are still IN_PROGRESS jobs, exit and let EventBridge poller continue checking
    const stillPending = Object.values(updatedTextractJobs).some((tj: any) => tj.status === 'IN_PROGRESS');
    if (stillPending) {
      console.log(`⏳ Still waiting on Textract jobs. EventBridge poller will check again in 1 minute.`);
      return { documentsProcessed: 0 };
    }
  }

  // Get documents for this job
  const documentIds = jobMetadata?.documentIds || [];

  const documents = await prisma.fundDocument.findMany({
    where: {
      id: { in: documentIds },
      fundId: job.fundId
    },
    include: {
      fund: true
    }
  });

  let processedCount = 0;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 DOCUMENT LOOP: Starting processing ${documents.length} documents`);
  console.log(`📋 Job ID: ${job.id}`);
  console.log(`📋 Documents: ${documents.map(d => d.filename).join(', ')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Process each document
  for (const document of documents) {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📄 DOCUMENT ${processedCount + 1}/${documents.length}: Starting ${document.filename}`);
      console.log(`📄 Type: ${document.documentType}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      await processDocument(document, job.metadata, job.id);
      processedCount++;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ DOCUMENT ${processedCount}/${documents.length}: Completed ${document.filename}`);
      console.log(`✅ Progress: ${processedCount}/${documents.length} (${Math.round(processedCount/documents.length*100)}%)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Update job progress
      await sqsService.updateJobProgress(job.id, processedCount, {
        lastProcessedDocument: document.id,
        lastProcessedAt: new Date().toISOString(),
        // Store caller context for branch routing verification
        ...(callerContext && { callerContext })
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for Textract async pending (large document still processing)
      if (errorMessage.includes('TEXTRACT_ASYNC_PENDING:')) {
        const match = errorMessage.match(/TEXTRACT_ASYNC_PENDING:([a-f0-9]+)/);
        const textractJobId = match ? match[1] : errorMessage.split('TEXTRACT_ASYNC_PENDING:')[1].split(/[\s\.]/)[0];
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`⏳ TEXTRACT ASYNC: Document ${document.filename} has Textract job pending: ${textractJobId}`);
        console.log(`⏳ Saving Textract JobId to metadata for background polling`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Get current job metadata
        const currentJob = await prisma.backgroundJob.findUnique({
          where: { id: job.id }
        });

        const currentMetadata = currentJob?.metadata as any || {};

        // Save Textract JobId to metadata and mark job as PROCESSING (not FAILED)
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.PROCESSING,
            metadata: {
              ...currentMetadata,
              textractJobs: {
                ...(currentMetadata.textractJobs || {}),
                [document.id]: {
                  jobId: textractJobId,
                  s3Key: document.s3Key,
                  filename: document.filename,
                  documentType: document.documentType,
                  startedAt: new Date().toISOString(),
                  status: 'IN_PROGRESS'
                }
              }
            }
          }
        });

        // NOTE: EventBridge Scheduler will poll this job every 1 minute
        // Once Textract completes, the poller will trigger job processing to continue
        console.log(`⏳ Job ${job.id} paused for Textract completion.`);
        console.log(`⏳ EventBridge poller will check status every 1 minute and resume when complete.`);

        return { documentsProcessed: processedCount };
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`❌ DOCUMENT ${processedCount + 1}/${documents.length}: Failed ${document.filename}`);
      console.error(`❌ Error: ${errorMessage}`);
      console.error(`❌ Stack:`, error instanceof Error ? error.stack : '');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      await sqsService.markJobFailed(job.id, `Failed to process document ${document.filename}: ${errorMessage}`);
      throw error;
    }
  }

  // Brain assembly is automatically triggered by sqsService.updateJobProgress when the job completes
  console.log(`Document processing completed for job ${job.id}. Brain assembly will be triggered automatically.`);

  return { documentsProcessed: processedCount };
}

/**
 * Analyze output template structure and format using Claude AI
 */
async function analyzeOutputTemplateWithClaude(documentContext: { filename: string; content: string }) {
  try {
    // Preserve the complete raw template content
    const rawTemplateContent = documentContext.content;

    // Dynamically find all placeholders using regex
    const placeholderRegex = /\[([^\]]+)\]/g;
    const placeholders: string[] = [];
    const placeholderDetails: Array<{placeholder: string, text: string, context: string}> = [];

    let match;
    while ((match = placeholderRegex.exec(rawTemplateContent)) !== null) {
      const fullPlaceholder = match[0]; // e.g., "[Amount]"
      const placeholderText = match[1]; // e.g., "Amount"

      if (!placeholders.includes(fullPlaceholder)) {
        placeholders.push(fullPlaceholder);

        // Extract some context around the placeholder for smart mapping
        const startPos = Math.max(0, match.index - 50);
        const endPos = Math.min(rawTemplateContent.length, match.index + 50);
        const context = rawTemplateContent.substring(startPos, endPos);

        placeholderDetails.push({
          placeholder: fullPlaceholder,
          text: placeholderText,
          context: context.trim()
        });
      }
    }

    console.log(`📋 Found ${placeholders.length} placeholders in template: ${placeholders.join(', ')}`);

    // Create template analysis that preserves raw content AND provides structure for compatibility
    const templateAnalysis = {
      // NEW: Raw template data for placeholder replacement
      rawTemplateContent: rawTemplateContent,
      placeholders: placeholders,
      placeholderDetails: placeholderDetails,
      useRawTemplate: true, // Flag to indicate this template should use raw mode

      // EXISTING: Structure for backwards compatibility
      templateType: "output_template",
      format: "raw_template_with_placeholders",
      structure: {
        sections: extractSectionsFromTemplate(rawTemplateContent),
        fields: placeholderDetails.map(p => ({
          name: p.text.toLowerCase().replace(/\s+/g, '_'),
          type: inferPlaceholderType(p.text, p.context),
          required: true,
          description: `Placeholder for ${p.text}`
        })),
        layout: "preserved_original"
      },
      mappingInstructions: {
        overallScore: "Dynamic based on placeholder context",
        categoryScores: "Dynamic based on placeholder context",
        feedback: "Dynamic based on placeholder context",
        recommendations: "Dynamic based on placeholder context",
        summary: "Dynamic based on placeholder context"
      },
      formattingRules: {
        scoreFormat: "context_dependent",
        textStyle: "preserve_original",
        lengthGuidelines: "as_per_template"
      },
      originalContent: rawTemplateContent,
      filename: documentContext.filename,
      analysisMode: "RAW_TEMPLATE_PRESERVATION"
    };

    return {
      templatesProcessed: 1,
      templateType: 'OUTPUT_TEMPLATE',
      filename: documentContext.filename,
      status: 'PROCESSED',
      ...templateAnalysis
    };

  } catch (error) {
    console.error('Error in template analysis:', error);
    throw new Error(`Template analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to extract sections from raw template content
function extractSectionsFromTemplate(content: string): string[] {
  const sections: string[] = [];

  // Look for common section patterns
  const sectionPatterns = [
    /^([A-Z][^:\n]*):?\s*$/gm, // Lines that start with capital letter and are section-like
    /^[\d\.]+\s+([^:\n]+):?\s*$/gm, // Numbered sections
    /^([^:\n]+):\s*$/gm, // Lines ending with colon
  ];

  sectionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const sectionName = match[1].trim();
      if (sectionName.length > 3 && sectionName.length < 100 && !sections.includes(sectionName)) {
        sections.push(sectionName);
      }
    }
  });

  return sections.length > 0 ? sections : ["Template Content"];
}

// Helper function to infer placeholder type from context
function inferPlaceholderType(placeholderText: string, context: string): string {
  const text = placeholderText.toLowerCase();
  const contextLower = context.toLowerCase();

  // Money/financial indicators
  if (text.includes('amount') || text.includes('funding') || text.includes('cost') ||
      text.includes('budget') || contextLower.includes('$') || contextLower.includes('dollar')) {
    return 'currency';
  }

  // Boolean indicators
  if (text.includes('yes') && text.includes('no') ||
      text.includes('confirmed') || text.includes('approved') ||
      contextLower.includes('yes/no')) {
    return 'boolean';
  }

  // Date indicators
  if (text.includes('date') || text.includes('time') || text.includes('deadline')) {
    return 'date';
  }

  // Score/rating indicators
  if (text.includes('score') || text.includes('rating') || text.includes('grade') ||
      contextLower.includes('out of') || contextLower.includes('/100')) {
    return 'score';
  }

  // Name/organization indicators
  if (text.includes('name') || text.includes('organisation') || text.includes('organization') ||
      text.includes('company') || text.includes('applicant')) {
    return 'text';
  }

  // Number indicators
  if (text.includes('number') || text.includes('count') || text.includes('quantity')) {
    return 'number';
  }

  // Default to text
  return 'text';
}

async function processDocument(document: any, jobMetadata?: any, jobId?: string) {
  console.log(`Processing document: ${document.filename} (${document.documentType})`);

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

  // Process based on document type
  switch (document.documentType) {
    case 'APPLICATION_FORM':
      // Try Claude analysis first, fallback to pattern matching if failed
      try {
        console.log('🧠 Attempting Claude AI analysis for application form in background processing... [FORCED RECOMPILE]');
        // Use pre-extracted text if available, otherwise extract now
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
        const documentContext = {
          filename: document.filename,
          content: textContent,
          extractedSections: []
        };

        analysisResult = await BackgroundJobService.analyzeApplicationFormDocument(textContent, document.filename);
        analysisResult.analysisMode = 'CLAUDE_AI';
        console.log('✅ Claude AI analysis successful for application form in background processing');

      } catch (claudeError) {
        console.error('❌ Claude AI analysis failed for application form - failing job:', claudeError);

        // CRITICAL: Don't wrap TEXTRACT_ASYNC_PENDING errors - they need to bubble up cleanly
        const errorMessage = claudeError instanceof Error ? claudeError.message : String(claudeError);
        if (errorMessage.includes('TEXTRACT_ASYNC_PENDING:')) {
          throw claudeError; // Re-throw as-is without wrapping
        }

        throw new Error(`AI analysis failed for application form document "${document.filename}": ${errorMessage}. Please try processing again.`);
      }

      // Update fund with application form analysis
      await prisma.fund.update({
        where: { id: document.fundId },
        data: {
          applicationFormAnalysis: analysisResult
        }
      });
      break;

    case 'SELECTION_CRITERIA':
      // Try Claude analysis first, fallback to pattern matching if failed
      try {
        console.log('🧠 Attempting Claude AI analysis for selection criteria in background processing...');
        // Use pre-extracted text if available, otherwise extract now
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
        const documentContexts = [{
          filename: document.filename,
          content: textContent,
          extractedSections: []
        }];

        const combinedText = textContent;
        analysisResult = await BackgroundJobService.analyzeSelectionCriteriaDocument(combinedText, document.filename);
        analysisResult.analysisMode = 'CLAUDE_AI';
        console.log('✅ Claude AI analysis successful for selection criteria in background processing');

      } catch (claudeError) {
        console.error('❌ Claude AI analysis failed for selection criteria - failing job:', claudeError);

        // CRITICAL: Don't wrap TEXTRACT_ASYNC_PENDING errors - they need to bubble up cleanly
        const errorMessage = claudeError instanceof Error ? claudeError.message : String(claudeError);
        if (errorMessage.includes('TEXTRACT_ASYNC_PENDING:')) {
          throw claudeError; // Re-throw as-is without wrapping
        }

        throw new Error(`AI analysis failed for selection criteria document "${document.filename}": ${errorMessage}. Please try processing again.`);
      }

      // Update fund with selection criteria analysis
      await prisma.fund.update({
        where: { id: document.fundId },
        data: {
          selectionCriteriaAnalysis: analysisResult
        }
      });
      break;

    case 'GOOD_EXAMPLES':
      // Try Claude analysis first, fallback to basic analysis if failed
      try {
        console.log('🧠 Attempting Claude AI analysis for good examples in background processing...');
        // Use pre-extracted text if available, otherwise extract now
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
        const documentContexts = [{
          filename: document.filename,
          content: textContent,
          extractedSections: []
        }];

        const combinedText = textContent;
        analysisResult = await BackgroundJobService.analyzeGoodExamplesDocument(combinedText, document.filename);
        analysisResult.analysisMode = 'CLAUDE_AI';
        console.log('✅ Claude AI analysis successful for good examples in background processing');

      } catch (claudeError) {
        console.error('❌ Claude AI analysis failed for good examples - failing job:', claudeError);

        // CRITICAL: Don't wrap TEXTRACT_ASYNC_PENDING errors - they need to bubble up cleanly
        const errorMessage = claudeError instanceof Error ? claudeError.message : String(claudeError);
        if (errorMessage.includes('TEXTRACT_ASYNC_PENDING:')) {
          throw claudeError; // Re-throw as-is without wrapping
        }

        throw new Error(`AI analysis failed for good examples document "${document.filename}": ${errorMessage}. Please try processing again.`);
      }
      
      // Update fund with good examples analysis
      await prisma.fund.update({
        where: { id: document.fundId },
        data: {
          goodExamplesAnalysis: analysisResult
        }
      });
      break;

    case 'OUTPUT_TEMPLATES':
      // Analyze output template structure for dynamic formatting
      try {
        console.log('🧠 Attempting Claude AI analysis for output template in background processing...');
        // Use pre-extracted text if available, otherwise extract now
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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

        analysisResult = await BackgroundJobService.analyzeOutputTemplateDocument(textContent, document.filename);

        analysisResult.analysisMode = 'CLAUDE_AI';
        console.log('✅ Claude AI analysis successful for output template in background processing');

        // Update fund with output template analysis
        await prisma.fund.update({
          where: { id: document.fundId },
          data: {
            outputTemplatesAnalysis: analysisResult
          }
        });

      } catch (claudeError) {
        console.error('❌ Claude AI analysis failed for output template - failing job:', claudeError);

        // CRITICAL: Don't wrap TEXTRACT_ASYNC_PENDING errors - they need to bubble up cleanly
        const errorMessage = claudeError instanceof Error ? claudeError.message : String(claudeError);
        if (errorMessage.includes('TEXTRACT_ASYNC_PENDING:')) {
          throw claudeError; // Re-throw as-is without wrapping
        }

        throw new Error(`AI analysis failed for output template document "${document.filename}": ${errorMessage}. Please try processing again.`);
      }

      console.log(`Output template processed: ${document.filename}`);
      break;

    default:
      throw new Error(`Unknown document type: ${document.documentType}`);
  }

  console.log(`Completed processing ${document.filename}: ${document.documentType}`);
  return analysisResult;
}


// GET endpoint to check processing status and pending jobs
export async function GET() {
  try {
    const pendingJobs = await prisma.backgroundJob.findMany({
      where: {
        status: {
          in: [JobStatus.PENDING, JobStatus.PROCESSING]
        }
      },
      include: {
        fund: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const completedJobs = await prisma.backgroundJob.count({
      where: {
        status: JobStatus.COMPLETED
      }
    });

    const failedJobs = await prisma.backgroundJob.count({
      where: {
        status: JobStatus.FAILED
      }
    });

    return NextResponse.json({
      success: true,
      pendingJobs: pendingJobs.length,
      completedJobs,
      failedJobs,
      jobs: pendingJobs.map(job => ({
        id: job.id,
        fundId: job.fundId,
        fundName: job.fund.name,
        type: job.type,
        status: job.status,
        progress: job.progress,
        processedDocuments: job.processedDocuments,
        totalDocuments: job.totalDocuments,
        createdAt: job.createdAt
      }))
    });

  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json({
      error: 'Failed to get job status'
    }, { status: 500 });
  }
}