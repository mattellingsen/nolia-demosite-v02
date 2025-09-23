import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/database-s3';
import { sqsService } from '@/lib/sqs-service';
import { analyzeApplicationForm, analyzeSelectionCriteria, extractTextFromFile } from '@/utils/server-document-analyzer';
import { BackgroundJobService } from '@/lib/background-job-service';
import { JobStatus, JobType } from '@prisma/client';

// S3 client configuration - matches pattern from other files
const s3Client = new S3Client({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
  ...(process.env.NODE_ENV === 'development' && 
      process.env.AWS_ACCESS_KEY_ID && 
      process.env.AWS_SECRET_ACCESS_KEY && 
      !process.env.AWS_ACCESS_KEY_ID.startsWith('ASIA') ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  } : {}),
});

const S3_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'nolia-funding-documents-ap-southeast-2-599065966827';

/**
 * Simulate document processing from SQS queue
 * In production, this would be a Lambda function triggered by SQS
 */
export async function POST(request: NextRequest) {
  try {
    const { jobId, documentId, force = false, autoTrigger = false, retry = false } = await request.json();

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
          const result = await processDocumentAnalysisJob(job);
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

      const result = await processDocumentAnalysisJob(job);
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

async function processDocumentAnalysisJob(job: any) {
  console.log(`Processing document analysis job: ${job.id}`);

  // Get documents for this job
  const jobMetadata = job.metadata as any;
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

  // Process each document
  for (const document of documents) {
    try {
      await processDocument(document);
      processedCount++;
      
      // Update job progress
      await sqsService.updateJobProgress(job.id, processedCount, {
        lastProcessedDocument: document.id,
        lastProcessedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Failed to process document ${document.id}:`, error);
      await sqsService.markJobFailed(job.id, `Failed to process document ${document.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

async function processDocument(document: any) {
  console.log(`Processing document: ${document.filename} (${document.documentType})`);

  // Download document from S3
  const getCommand = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: document.s3Key
  });

  const s3Response = await s3Client.send(getCommand);
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
        const textContent = await extractTextFromFile(fileObject as File);
        const documentContext = {
          filename: document.filename,
          content: textContent,
          extractedSections: []
        };

        analysisResult = await BackgroundJobService.analyzeApplicationFormDocument(textContent, document.filename);
        analysisResult.analysisMode = 'CLAUDE_AI';
        console.log('✅ Claude AI analysis successful for application form in background processing');

      } catch (claudeError) {
        console.warn('⚠️ Claude AI analysis failed for application form in background processing, falling back to pattern matching:', claudeError);
        analysisResult = await analyzeApplicationForm(fileObject as File);
        analysisResult.analysisMode = 'BASIC_FALLBACK';
        analysisResult.analysisWarning = 'AI analysis failed for application form - using basic fallback analysis. The assessment quality may be reduced.';
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
        const textContent = await extractTextFromFile(fileObject as File);
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
        console.warn('⚠️ Claude AI analysis failed for selection criteria in background processing, falling back to pattern matching:', claudeError);
        analysisResult = await analyzeSelectionCriteria([fileObject as File]);
        analysisResult.analysisMode = 'BASIC_FALLBACK';
        analysisResult.analysisWarning = 'AI analysis failed - using basic fallback analysis. The assessment quality may be reduced.';
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
        const textContent = await extractTextFromFile(fileObject as File);
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
        console.warn('⚠️ Claude AI analysis failed for good examples in background processing, using basic fallback:', claudeError);

        // Use basic analysis fallback
        analysisResult = {
          examplesAnalyzed: 1,
          averageScore: 85,
          qualityIndicators: [
            {
              name: 'Document Structure',
              score: 85,
              description: 'Well-organized application with clear sections'
            },
            {
              name: 'Content Quality',
              score: 80,
              description: 'Comprehensive and relevant information provided'
            }
          ],
          writingPatterns: [
            'Clear and professional writing style',
            'Logical flow between sections',
            'Appropriate detail level'
          ],
          commonStrengths: [
            'Well-structured',
            'Professional presentation',
            'Complete information'
          ],
          analysisMode: 'BASIC_FALLBACK',
          analysisWarning: 'AI analysis failed in background processing - using basic fallback analysis. The assessment quality may be reduced.',
          error: claudeError.message || 'Background processing Claude error',
          requiresReview: true
        };
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
        const textContent = await extractTextFromFile(fileObject as File);

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
        console.warn('⚠️ Claude AI analysis failed for output template in background processing, using basic fallback:', claudeError);

        // Use basic analysis fallback
        analysisResult = {
          templatesProcessed: 1,
          templateType: 'OUTPUT_TEMPLATE',
          filename: document.filename,
          status: 'PROCESSED',
          structure: {
            format: 'UNKNOWN',
            sections: [],
            fields: []
          },
          analysisMode: 'BASIC_FALLBACK',
          analysisWarning: 'AI analysis failed - using basic template storage. Dynamic formatting may not work properly.',
          error: claudeError.message || 'Template analysis error'
        };

        // Update fund with basic output template analysis
        await prisma.fund.update({
          where: { id: document.fundId },
          data: {
            outputTemplatesAnalysis: analysisResult
          }
        });
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