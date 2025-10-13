// Background job processing service for RAG and document analysis
import { prisma } from './database-s3';
import { extractTextFromFile } from '../utils/server-document-analyzer';
import { claudeService, ClaudeService } from './claude-service';
import { storeDocumentVector, generateEmbedding, initializeOpenSearchIndex, chunkText, validateFundEmbeddings } from './aws-opensearch';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from './aws-credentials';

// Job types
export type JobType = 'RAG_PROCESSING' | 'DOCUMENT_ANALYSIS';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BackgroundJobData {
  id: string;
  fundId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  totalDocuments: number;
  processedDocuments: number;
  metadata: any;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Background Job Service - handles async processing of RAG and document analysis
 */
export class BackgroundJobService {
  
  /**
   * Create a new background job
   */
  static async createJob(fundId: string, type: JobType, metadata: any = {}): Promise<BackgroundJobData> {
    const job = await prisma.backgroundJob.create({
      data: {
        fundId,
        type,
        metadata,
        status: 'PENDING'
      }
    });
    
    console.log(`Created background job ${job.id} for fund ${fundId} (type: ${type})`);
    return job as BackgroundJobData;
  }
  
  /**
   * Update job status and progress
   */
  static async updateJob(
    jobId: string, 
    updates: Partial<BackgroundJobData>
  ): Promise<BackgroundJobData> {
    const job = await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });
    
    return job as BackgroundJobData;
  }
  
  /**
   * Get job status
   */
  static async getJob(jobId: string): Promise<BackgroundJobData | null> {
    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId }
    });
    
    return job as BackgroundJobData | null;
  }
  
  /**
   * Get all jobs for a fund
   */
  static async getFundJobs(fundId: string): Promise<BackgroundJobData[]> {
    const jobs = await prisma.backgroundJob.findMany({
      where: { fundId },
      orderBy: { createdAt: 'desc' }
    });
    
    return jobs as BackgroundJobData[];
  }
  
  /**
   * Process a RAG job - complete document analysis and vector storage
   */
  static async processRAGJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    try {
      // Mark job as processing
      await this.updateJob(jobId, {
        status: 'PROCESSING',
        startedAt: new Date(),
        progress: 0
      });
      
      // Check if job has file data (new async approach)
      if (job.metadata?.files) {
        console.log(`Processing job with embedded files: ${job.metadata.files.length} files`);
        await this.processJobWithFiles(jobId, job.metadata.files);
        return;
      }
      
      // Legacy approach: Get fund and documents from database
      const fund = await prisma.fund.findUnique({
        where: { id: job.fundId },
        include: { documents: true }
      });
      
      if (!fund) {
        throw new Error(`Fund ${job.fundId} not found`);
      }
      
      // First, perform document analysis if not already done
      await this.performDocumentAnalysis(fund.id);

      // Initialize OpenSearch index for this module type
      const moduleType = fund.moduleType as 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' | 'WORLDBANK' | 'WORLDBANK_ADMIN';
      console.log(`Initializing OpenSearch index for module: ${moduleType}`);
      await initializeOpenSearchIndex(moduleType);

      const documents = fund.documents;
      const totalDocuments = documents.length;

      await this.updateJob(jobId, {
        totalDocuments,
        progress: 5
      });

      console.log(`Processing ${totalDocuments} documents for RAG indexing (${moduleType})`);

      // CRITICAL: Check for pending Textract jobs and poll for completion
      const textractJobs = (job.metadata as any)?.textractJobs || {};

      if (Object.keys(textractJobs).length > 0) {
        console.log(`🔍 Found ${Object.keys(textractJobs).length} Textract job(s) to check...`);
        const { getTextractJobStatus, getTextractJobResults } = await import('./aws-textract');

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
          await this.updateJob(jobId, {
            metadata: {
              ...job.metadata,
              textractJobs: updatedTextractJobs
            }
          });
          console.log(`✅ Updated Textract job statuses in metadata`);
        }

        // If there are still IN_PROGRESS jobs, exit and let EventBridge poller continue checking
        const stillPending = Object.values(updatedTextractJobs).some((tj: any) => tj.status === 'IN_PROGRESS');
        if (stillPending) {
          console.log(`⏳ Still waiting on Textract jobs. EventBridge poller will check again in 1 minute.`);
          return;
        }
      }

      // Success tracking counters
      let successfulDocuments = 0;
      let failedDocuments = 0;
      let successfulChunks = 0;
      let failedChunks = 0;
      const failedItems: Array<{
        documentId: string;
        filename: string;
        error: string;
        chunkIndex?: number;
      }> = [];

      // Process each document
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        let documentSuccess = false;
        let documentChunksSucceeded = 0;
        let documentChunksFailed = 0;

        try {
          console.log(`Processing document ${i + 1}/${totalDocuments}: ${document.filename}`);

          // Check if Textract already extracted text (from async job)
          const textractJobs = (job.metadata as any)?.textractJobs || {};
          const textractJob = textractJobs[document.id];

          let documentText: string;

          if (textractJob?.status === 'SUCCEEDED' && textractJob.extractedText) {
            console.log(`📄 Using pre-extracted Textract text for ${document.filename} (${textractJob.textLength} chars)`);
            documentText = textractJob.extractedText;
          } else {
            // Extract text from S3
            documentText = await this.extractTextFromS3Document(document.s3Key);
          }

          // Skip if no meaningful text (but don't fail the job)
          if (documentText.length < 10) {
            console.log(`⚠️ Skipping document ${document.filename} - insufficient text content`);
            failedDocuments++;
            failedItems.push({
              documentId: document.id,
              filename: document.filename,
              error: 'Insufficient text content (< 10 characters)'
            });
            continue;
          }

          // Chunk the text to handle large documents (8,192 token limit)
          const chunks = chunkText(documentText);
          const isChunked = chunks.length > 1;

          console.log(`📄 Document "${document.filename}" split into ${chunks.length} chunk(s) (${documentText.length} chars)`);

          // Process each chunk
          for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const chunk = chunks[chunkIndex];
            const vectorId = isChunked
              ? `${document.id}-chunk-${chunkIndex + 1}`
              : document.id;

            try {
              console.log(`  Generating embedding for chunk ${chunkIndex + 1}/${chunks.length}...`);

              // Generate embedding for this chunk
              const embedding = await generateEmbedding(chunk);

              // Store chunk in OpenSearch
              await storeDocumentVector({
                id: vectorId,
                fundId: fund.id,
                documentType: document.documentType,
                filename: document.filename,
                content: chunk,
                embedding,
                moduleType: fund.moduleType as 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' | 'WORLDBANK' | 'WORLDBANK_ADMIN',
                metadata: {
                  uploadedAt: document.uploadedAt.toISOString(),
                  fileSize: document.fileSize,
                  mimeType: document.mimeType,
                  ...(isChunked && {
                    originalDocumentId: document.id,
                    chunkIndex: chunkIndex + 1,
                    totalChunks: chunks.length,
                    isChunk: true
                  })
                },
              });

              console.log(`  ✅ Successfully stored chunk ${chunkIndex + 1}/${chunks.length}`);
              successfulChunks++;
              documentChunksSucceeded++;

            } catch (chunkError) {
              const errorMessage = chunkError instanceof Error ? chunkError.message : String(chunkError);
              console.error(`  ❌ Failed to process chunk ${chunkIndex + 1}/${chunks.length}:`, errorMessage);
              failedChunks++;
              documentChunksFailed++;
              failedItems.push({
                documentId: document.id,
                filename: document.filename,
                error: `Chunk ${chunkIndex + 1}/${chunks.length} failed: ${errorMessage}`,
                chunkIndex: chunkIndex + 1
              });
            }
          }

          // Document succeeds if at least one chunk succeeded
          if (documentChunksSucceeded > 0) {
            documentSuccess = true;
            successfulDocuments++;
            console.log(`✅ Successfully processed document ${i + 1}/${totalDocuments} (${documentChunksSucceeded}/${chunks.length} chunks succeeded)`);
          } else {
            failedDocuments++;
            console.error(`❌ Document ${document.filename} completely failed - no chunks succeeded`);
          }

          // Update progress (after all chunks processed)
          const processedDocuments = i + 1;
          const progress = Math.min(95, Math.round((processedDocuments / totalDocuments) * 90) + 5);

          await this.updateJob(jobId, {
            processedDocuments,
            progress,
            metadata: {
              ...job.metadata,
              successfulDocuments,
              failedDocuments,
              successfulChunks,
              failedChunks,
              lastProcessedDocument: document.filename
            }
          });

        } catch (docError) {
          const errorMessage = docError instanceof Error ? docError.message : String(docError);

          // Check for Textract async pending (large document still processing)
          if (errorMessage.includes('TEXTRACT_ASYNC_PENDING:')) {
            const match = errorMessage.match(/TEXTRACT_ASYNC_PENDING:([a-f0-9]+)/);
            const textractJobId = match ? match[1] : errorMessage.split('TEXTRACT_ASYNC_PENDING:')[1].split(/[\s\.]/)[0];
            console.log(`⏳ Document ${document.filename} has Textract job pending: ${textractJobId}`);
            console.log(`⏳ Saving Textract JobId to metadata for background polling`);

            // Save Textract JobId to metadata and mark job as PROCESSING (not FAILED)
            await this.updateJob(jobId, {
              status: 'PROCESSING',
              metadata: {
                ...job.metadata,
                textractJobs: {
                  ...(job.metadata?.textractJobs || {}),
                  [document.id]: {
                    jobId: textractJobId,
                    s3Key: document.s3Key,
                    filename: document.filename,
                    startedAt: new Date().toISOString(),
                    status: 'IN_PROGRESS'
                  }
                }
              }
            });

            // CRITICAL: Self-trigger retry in 30 seconds (serverless-compatible)
            console.log(`⏳ Job ${jobId} paused for Textract completion. Scheduling retry in 30s...`);

            // Determine the base URL
            const baseUrl = process.env.NODE_ENV === 'production'
              ? `https://${process.env.AWS_BRANCH || 'staging'}.d2l8hlr3sei3te.amplifyapp.com`
              : 'http://localhost:3000';

            // Schedule self-trigger (setTimeout will complete before Lambda terminates)
            setTimeout(() => {
              fetch(`${baseUrl}/api/jobs/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jobId: jobId,
                  autoTrigger: true,
                  source: 'textract-poll-rag'
                })
              }).catch(err => {
                console.error(`Failed to trigger retry for RAG job ${jobId}:`, err);
              });
            }, 30000);

            return { documentsProcessed: i };
          }

          console.error(`❌ Error processing document ${document.filename}:`, errorMessage);
          failedDocuments++;
          failedItems.push({
            documentId: document.id,
            filename: document.filename,
            error: errorMessage
          });
        }
      }

      // Validate embeddings were actually created in OpenSearch
      console.log(`🔍 Validating embeddings for fund ${job.fundId}...`);
      const validation = await validateFundEmbeddings(job.fundId, moduleType);

      console.log(`📊 Validation Results:
        - Embeddings created: ${validation.count}
        - Successful documents: ${successfulDocuments}/${totalDocuments}
        - Successful chunks: ${successfulChunks}
        - Failed chunks: ${failedChunks}`);

      // Determine job success based on actual embeddings created
      const hasAnyEmbeddings = validation.count > 0;
      const hasCompleteFailure = successfulDocuments === 0 || validation.count === 0;
      const hasCountDiscrepancy = validation.count < successfulChunks;
      const hasPartialFailure = failedDocuments > 0 || failedChunks > 0;

      // Build metadata with all tracking info
      const finalMetadata = {
        ...job.metadata,
        successfulDocuments,
        failedDocuments,
        successfulChunks,
        failedChunks,
        embeddingsCreated: validation.count,
        validationTimestamp: new Date().toISOString(),
        indexName: validation.indexName,
        failedItems: failedItems.length > 0 ? failedItems : undefined
      };

      if (hasCompleteFailure) {
        // Complete failure - NO embeddings created
        console.error(`❌ RAG job ${jobId} FAILED - No embeddings were created`);

        await this.updateJob(jobId, {
          status: 'FAILED',
          progress: 100,
          errorMessage: `No embeddings created. ${failedDocuments} document(s) failed, ${failedChunks} chunk(s) failed.`,
          completedAt: new Date(),
          metadata: finalMetadata
        });

        // Do NOT mark fund as ACTIVE
        console.error(`Fund ${job.fundId} remains in current status - no functional brain created`);

      } else if (hasCountDiscrepancy) {
        // Count discrepancy - we think we succeeded but OpenSearch has fewer embeddings
        console.warn(`⚠️ RAG job ${jobId} completed with storage discrepancy`);
        console.warn(`   Expected ${successfulChunks} chunks, but OpenSearch has ${validation.count} embeddings`);
        console.warn(`   This suggests some chunks failed to store despite appearing successful`);

        await this.updateJob(jobId, {
          status: 'COMPLETED',
          progress: 100,
          errorMessage: `Storage discrepancy: Expected ${successfulChunks} embeddings but only ${validation.count} were stored. Some chunks may have failed silently.`,
          completedAt: new Date(),
          metadata: finalMetadata
        });

        // Mark fund as ACTIVE but with warning
        await prisma.fund.update({
          where: { id: job.fundId },
          data: {
            status: 'ACTIVE',
            brainAssembledAt: new Date()
          }
        });

        console.warn(`⚠️ Fund ${job.fundId} marked ACTIVE but brain may be incomplete (storage discrepancy)`);

      } else if (hasPartialFailure) {
        // Partial success - some embeddings created but with errors
        console.warn(`⚠️ RAG job ${jobId} completed with warnings`);
        console.warn(`   ${successfulDocuments}/${totalDocuments} documents succeeded`);
        console.warn(`   ${validation.count} embeddings created`);
        console.warn(`   ${failedDocuments} document(s) failed, ${failedChunks} chunk(s) failed`);

        await this.updateJob(jobId, {
          status: 'COMPLETED',
          progress: 100,
          errorMessage: `Partial success: ${failedDocuments} document(s) failed, ${failedChunks} chunk(s) failed. See metadata for details.`,
          completedAt: new Date(),
          metadata: finalMetadata
        });

        // Mark fund as ACTIVE but log warning
        await prisma.fund.update({
          where: { id: job.fundId },
          data: {
            status: 'ACTIVE',
            brainAssembledAt: new Date()
          }
        });

        console.warn(`⚠️ Fund ${job.fundId} marked ACTIVE but with degraded brain (partial failures occurred)`);

      } else {
        // Complete success
        console.log(`✅ RAG job ${jobId} completed successfully`);
        console.log(`   All ${totalDocuments} documents processed`);
        console.log(`   ${validation.count} embeddings created`);

        await this.updateJob(jobId, {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
          metadata: finalMetadata
        });

        // Trigger brain assembly for modules that have brain endpoints
        const moduleType = fund.moduleType as 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' | 'WORLDBANK' | 'WORLDBANK_ADMIN';
        if (moduleType === 'PROCUREMENT_ADMIN' || moduleType === 'WORLDBANK' || moduleType === 'WORLDBANK_ADMIN') {
          console.log(`🧠 Triggering brain assembly for ${moduleType} fund ${job.fundId}...`);

          // Determine the correct brain endpoint for this module
          let brainEndpoint: string;
          if (moduleType === 'PROCUREMENT_ADMIN') {
            brainEndpoint = `/api/procurement-brain/${job.fundId}/assemble`;
          } else if (moduleType === 'WORLDBANK') {
            brainEndpoint = `/api/worldbank-brain/${job.fundId}/assemble`;
          } else if (moduleType === 'WORLDBANK_ADMIN') {
            brainEndpoint = `/api/worldbank-admin-brain/${job.fundId}/assemble`;
          }

          // Call brain assembly endpoint (non-blocking)
          // Auto-detect branch from AWS Amplify environment variable
          let baseUrl = 'http://localhost:3000';
          if (process.env.NODE_ENV === 'production') {
            const branch = process.env.AWS_BRANCH || 'main';
            const appId = 'd2l8hlr3sei3te';
            baseUrl = `https://${branch}.${appId}.amplifyapp.com`;
            console.log(`🔗 Brain assembly: Auto-detected branch ${branch}, using ${baseUrl}`);
          }

          fetch(`${baseUrl}${brainEndpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
            .then(async (response) => {
              if (response.ok) {
                console.log(`✅ Brain assembly triggered successfully for fund ${job.fundId}`);
              } else {
                const text = await response.text();
                console.error(`❌ Brain assembly failed for fund ${job.fundId}: ${response.status} - ${text}`);
              }
            })
            .catch((error) => {
              console.error(`❌ Error triggering brain assembly for fund ${job.fundId}:`, error);
            });
        } else {
          // For FUNDING module (no brain endpoint), just mark as ACTIVE
          await prisma.fund.update({
            where: { id: job.fundId },
            data: {
              status: 'ACTIVE',
              brainAssembledAt: new Date()
            }
          });

          console.log(`✅ Fund ${job.fundId} status updated to ACTIVE with functional brain`);
        }
      }
      
    } catch (error) {
      console.error(`RAG job ${jobId} failed:`, error);
      
      await this.updateJob(jobId, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      });
      
      throw error;
    }
  }
  
  /**
   * Process a job with embedded file data (async approach)
   */
  private static async processJobWithFiles(jobId: string, filesData: any[]): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    try {
      console.log(`Processing ${filesData.length} files for fund ${job.fundId}`);
      
      // Process each file: upload to S3, create document record, analyze
      for (let i = 0; i < filesData.length; i++) {
        const fileData = filesData[i];
        const progress = Math.round((i / filesData.length) * 90); // Leave 10% for final processing
        
        await this.updateJob(jobId, { progress });
        
        try {
          console.log(`Processing file ${i + 1}/${filesData.length}: ${fileData.filename}`);
          
          // Convert base64 back to buffer
          const buffer = Buffer.from(fileData.data, 'base64');
          
          // Upload to S3
          const s3Key = await this.uploadBufferToS3(buffer, fileData.filename, fileData.mimeType, fileData.type.toLowerCase());
          
          // Create document record
          const document = await prisma.fundDocument.create({
            data: {
              fundId: job.fundId,
              documentType: fileData.type,
              filename: fileData.filename,
              mimeType: fileData.mimeType,
              fileSize: fileData.size,
              s3Key
            }
          });
          
          // Analyze document
          const fileBlob = new Blob([buffer], { type: fileData.mimeType });
          const file = new File([fileBlob], fileData.filename, { type: fileData.mimeType });
          
          let analysis;
          if (fileData.type === 'APPLICATION_FORM') {
            // Use new Claude service for application form analysis
            const textContent = await extractTextFromFile(file);
            analysis = await this.analyzeApplicationFormDocument(textContent, file.name);
          } else if (fileData.type === 'OUTPUT_TEMPLATES') {
            // Use new Claude service for output template analysis
            const textContent = await extractTextFromFile(file);
            analysis = await this.analyzeOutputTemplateDocument(textContent, file.name);
          } else if (fileData.type === 'GOOD_EXAMPLES') {
            // Use new Claude service for good examples analysis
            const textContent = await extractTextFromFile(file);
            analysis = await this.analyzeGoodExamplesDocument(textContent, file.name);
          } else {
            // Default: Use new Claude service for selection criteria analysis
            const textContent = await extractTextFromFile(file);
            analysis = await this.analyzeSelectionCriteriaDocument(textContent, file.name);
          }
          
          console.log(`Successfully processed ${fileData.filename}`);
          
        } catch (fileError) {
          console.error(`Error processing file ${fileData.filename}:`, fileError);
          // Continue with other files
        }
      }
      
      // Update fund with analysis results (fetch from database records)
      await this.updateFundAnalysisFromDocuments(job.fundId);

      // Mark job as completed
      await this.updateJob(jobId, {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date()
      });

      // Update fund status to ACTIVE when RAG processing completes
      await prisma.fund.update({
        where: { id: job.fundId },
        data: {
          status: 'ACTIVE',
          brainAssembledAt: new Date()
        }
      });

      console.log(`Async job ${jobId} completed successfully - Fund ${job.fundId} status updated to ACTIVE`);
      
    } catch (error) {
      console.error(`Async job ${jobId} failed:`, error);
      
      await this.updateJob(jobId, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      });
      
      throw error;
    }
  }

  /**
   * Upload buffer to S3 and return key
   */
  private static async uploadBufferToS3(buffer: Buffer, filename: string, mimeType: string, folder: string): Promise<string> {
    const { uploadFileToS3 } = await import('./database-s3');
    return await uploadFileToS3(buffer, filename, mimeType, folder);
  }

  /**
   * Update fund analysis from processed documents
   */
  private static async updateFundAnalysisFromDocuments(fundId: string): Promise<void> {
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: { documents: true }
    });
    
    if (!fund) return;
    
    // Group documents by type and update analysis accordingly
    const updates: any = {};
    
    if (fund.documents.some(d => d.documentType === 'APPLICATION_FORM')) {
      updates.applicationFormAnalysis = { status: 'completed' };
    }
    
    if (fund.documents.some(d => d.documentType === 'SELECTION_CRITERIA')) {
      updates.selectionCriteriaAnalysis = { status: 'completed' };
    }
    
    if (fund.documents.some(d => d.documentType === 'GOOD_EXAMPLES')) {
      updates.goodExamplesAnalysis = { status: 'completed' };
    }

    if (fund.documents.some(d => d.documentType === 'OUTPUT_TEMPLATES')) {
      updates.outputTemplatesAnalysis = { status: 'completed' };
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.fund.update({
        where: { id: fundId },
        data: updates
      });
    }
  }

  /**
   * Perform document analysis for a fund
   */
  private static async performDocumentAnalysis(fundId: string): Promise<void> {
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: { documents: true }
    });
    
    if (!fund) return;
    
    // Check if we have documents to analyze
    if (!fund.documents || fund.documents.length === 0) {
      console.log('No documents to analyze for fund', fundId);
      return;
    }
    
    console.log('Performing document analysis for fund', fundId);
    
    // Get documents grouped by type
    const applicationFormDocs = fund.documents.filter(d => d.documentType === 'APPLICATION_FORM');
    const selectionCriteriaDocs = fund.documents.filter(d => d.documentType === 'SELECTION_CRITERIA');
    const goodExamplesDocs = fund.documents.filter(d => d.documentType === 'GOOD_EXAMPLES');
    const outputTemplateDocs = fund.documents.filter(d => d.documentType === 'OUTPUT_TEMPLATES');
    
    let applicationFormAnalysis = fund.applicationFormAnalysis;
    let selectionCriteriaAnalysis = fund.selectionCriteriaAnalysis;
    let goodExamplesAnalysis = fund.goodExamplesAnalysis;
    let outputTemplatesAnalysis = fund.outputTemplatesAnalysis;
    
    // Analyze application form
    if (applicationFormDocs.length > 0 && (!fund.applicationFormAnalysis || fund.applicationFormAnalysis?.status === 'pending_analysis' || fund.applicationFormAnalysis?.status === 'completed')) {
      try {
        const doc = applicationFormDocs[0];
        const text = await this.extractTextFromS3Document(doc.s3Key);
        console.log(`🤖 Running Claude analysis for application form: ${doc.filename}`);
        applicationFormAnalysis = await this.analyzeApplicationFormDocument(text, doc.filename);
        console.log(`✅ Claude analysis completed for application form`);
      } catch (error) {
        console.error('❌ Error analyzing application form:', error);
      }
    }
    
    // Analyze selection criteria
    if (selectionCriteriaDocs.length > 0 && (!fund.selectionCriteriaAnalysis || fund.selectionCriteriaAnalysis?.status === 'pending_analysis' || fund.selectionCriteriaAnalysis?.status === 'completed')) {
      try {
        console.log(`🤖 Running Claude analysis for selection criteria: ${selectionCriteriaDocs.length} documents`);
        // Process multiple documents by combining their content
        const combinedText = await Promise.all(
          selectionCriteriaDocs.map(async (doc) => {
            const text = await this.extractTextFromS3Document(doc.s3Key);
            return `Document: ${doc.filename}\n\n${text}`;
          })
        );
        selectionCriteriaAnalysis = await this.analyzeSelectionCriteriaDocument(
          combinedText.join('\n\n---\n\n'),
          selectionCriteriaDocs.map(d => d.filename).join(', ')
        );
        console.log(`✅ Claude analysis completed for selection criteria`);
      } catch (error) {
        console.error('❌ Error analyzing selection criteria:', error);
      }
    }
    
    // Analyze good examples
    if (goodExamplesDocs.length > 0 && (!fund.goodExamplesAnalysis || fund.goodExamplesAnalysis?.status === 'pending_analysis' || fund.goodExamplesAnalysis?.status === 'completed')) {
      try {
        console.log(`🤖 Running Claude analysis for good examples: ${goodExamplesDocs.length} documents`);
        // Process multiple documents by combining their content
        const combinedText = await Promise.all(
          goodExamplesDocs.map(async (doc) => {
            const text = await this.extractTextFromS3Document(doc.s3Key);
            return `Document: ${doc.filename}\n\n${text}`;
          })
        );
        goodExamplesAnalysis = await this.analyzeGoodExamplesDocument(
          combinedText.join('\n\n---\n\n'),
          goodExamplesDocs.map(d => d.filename).join(', ')
        );
        console.log(`✅ Claude analysis completed for good examples`);
      } catch (error) {
        console.error('❌ Error analyzing good examples:', error);
      }
    }

    // Analyze output templates
    if (outputTemplateDocs.length > 0 && (!fund.outputTemplatesAnalysis || fund.outputTemplatesAnalysis?.status === 'pending_analysis' || fund.outputTemplatesAnalysis?.status === 'completed')) {
      try {
        console.log(`🤖 Running Claude analysis for output templates: ${outputTemplateDocs.length} documents`);
        // Process first output template document
        const doc = outputTemplateDocs[0];
        const text = await this.extractTextFromS3Document(doc.s3Key);
        outputTemplatesAnalysis = await this.analyzeOutputTemplateDocument(text, doc.filename);
        console.log(`✅ Claude analysis completed for output templates`);
      } catch (error) {
        console.error('❌ Error analyzing output templates:', error);
      }
    }

    // Update fund with analysis results
    await prisma.fund.update({
      where: { id: fundId },
      data: {
        applicationFormAnalysis,
        selectionCriteriaAnalysis,
        goodExamplesAnalysis,
        outputTemplatesAnalysis
      }
    });
    
    console.log('Document analysis complete for fund', fundId);
  }
  
  /**
   * Extract text from S3 document
   */
  private static async extractTextFromS3Document(s3Key: string): Promise<string> {
    // CRITICAL FIX: Create S3 client without credentials parameter
    // Lambda execution role will be used automatically - no getAWSCredentials() call to prevent pollution
    const s3Client = new S3Client({
      region: AWS_REGION,
      // NO credentials - Lambda execution role is used automatically
    });

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error('No content in S3 object');
    }

    // Convert stream to buffer (Node.js stream handling)
    const chunks: Buffer[] = [];

    // Handle Node.js Readable stream
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Create a File-like object for the document analyzer
    const fileBlob = new File([buffer], s3Key.split('/').pop() || 'document', {
      type: response.ContentType || 'application/octet-stream'
    });

    // Pass S3 key for PDF processing (Textract requires S3 location)
    return await extractTextFromFile(fileBlob, s3Key);
  }
  
  /**
   * Start processing jobs (can be called periodically or on-demand)
   */
  static async processNextJob(): Promise<boolean> {
    // Find the next pending job
    const job = await prisma.backgroundJob.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });

    if (!job) {
      return false; // No pending jobs
    }

    try {
      if (job.type === 'RAG_PROCESSING') {
        await this.processRAGJob(job.id);
      } else if (job.type === 'DOCUMENT_ANALYSIS') {
        // Handle DOCUMENT_ANALYSIS jobs by calling the process API
        console.log(`🚀 Processing DOCUMENT_ANALYSIS job ${job.id} via immediate trigger`);

        const baseUrl = process.env.NODE_ENV === 'production'
          ? `https://${process.env.AWS_BRANCH || 'main'}.d2l8hlr3sei3te.amplifyapp.com`
          : 'http://localhost:3000';

        const callerContext = {
          detectedBranch: process.env.AWS_BRANCH || 'undefined',
          constructedUrl: `${baseUrl}/api/jobs/process`,
          nodeEnv: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
          source: 'BackgroundJobService.processNextJob'
        };

        const response = await fetch(`${baseUrl}/api/jobs/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: job.id,
            autoTrigger: true,
            immediateTrigger: true,
            callerContext
          })
        });

        if (!response.ok) {
          console.error(`❌ Immediate trigger failed for job ${job.id}, status: ${response.status}`);
          console.error(`   Job will be picked up by background processor instead`);
        } else {
          console.log(`✅ Successfully triggered immediate processing for job ${job.id}`);
        }
      }
      // Add other job types here as needed

      return true;
    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);
      return false;
    }
  }

  /**
   * Analyze application form document using new Claude service
   */
  static async analyzeApplicationFormDocument(content: string, filename: string): Promise<any> {
    try {
      const response = await claudeService.executeTask({
        task: 'analyze_application_form',
        prompt: ClaudeService.createFocusedPrompt(
          'Application Form Analysis',
          content,
          `
            Analyze this application form document to understand its structure and required fields.

            Extract information about:
            1. Required fields and their types
            2. Section organization
            3. Validation requirements
            4. Field labels and descriptions
          `,
          `
            Respond with valid JSON only:
            {
              "status": "completed",
              "fields": [
                {
                  "name": "field_name",
                  "label": "Field Label",
                  "type": "text|number|email|date|select",
                  "required": true|false,
                  "section": "section_name"
                }
              ],
              "sections": [
                {
                  "name": "section_name",
                  "title": "Section Title",
                  "fields": ["field1", "field2"]
                }
              ]
            }
          `
        ),
        maxTokens: 32000,
        temperature: 0.3,
      });

      if (response.success) {
        return JSON.parse(response.content.match(/\{[\s\S]*\}/)?.[0] || '{}');
      } else {
        return { status: 'failed', error: 'Claude analysis failed' };
      }
    } catch (error) {
      console.error('Error in application form analysis:', error);
      return { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Analyze selection criteria document using new Claude service
   */
  static async analyzeSelectionCriteriaDocument(content: string, filename: string): Promise<any> {
    try {
      // Add 30-second timeout protection to prevent infinite hangs
      const response = await Promise.race([
        claudeService.executeTask({
          task: 'analyze_selection_criteria',
          prompt: ClaudeService.createFocusedPrompt(
            'Selection Criteria Analysis',
            content,
            `
              Analyze this selection criteria document to extract assessment criteria and scoring guidelines.

              Extract information about:
              1. Assessment criteria categories
              2. Scoring ranges and weights
              3. Key evaluation indicators
              4. Assessment instructions
            `,
            `
              Respond with valid JSON only:
              {
                "status": "completed",
                "criteria": [
                  {
                    "name": "criterion_name",
                    "description": "What this criterion evaluates",
                    "weight": 25,
                    "maxScore": 100,
                    "keyIndicators": ["indicator1", "indicator2"]
                  }
                ],
                "overallInstructions": "General assessment guidelines"
              }
            `
          ),
          maxTokens: 32000,
          temperature: 0.3,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Claude AI analysis timeout after 5 minutes. Please try processing again.')), 300000)
        )
      ]);

      if (response.success) {
        return JSON.parse(response.content.match(/\{[\s\S]*\}/)?.[0] || '{}');
      } else {
        return { status: 'failed', error: 'Claude analysis failed' };
      }
    } catch (error) {
      console.error('Error in selection criteria analysis:', error);
      // Re-throw to trigger fallback in the calling code
      throw error;
    }
  }

  /**
   * Analyze good examples document using new Claude service
   */
  static async analyzeGoodExamplesDocument(content: string, filename: string): Promise<any> {
    try {
      // Add 30-second timeout protection to prevent infinite hangs
      const response = await Promise.race([
        claudeService.executeTask({
          task: 'analyze_good_examples',
          prompt: ClaudeService.createFocusedPrompt(
            'Good Examples Analysis',
            content,
            `
              Analyze these good example applications to identify success patterns.

              Extract information about:
              1. Common strengths in successful applications
              2. Patterns in high-scoring responses
              3. Key success factors
              4. Quality indicators
            `,
            `
              Respond with valid JSON only:
              {
                "status": "completed",
                "successPatterns": {
                  "commonStrengths": ["strength1", "strength2"],
                  "keyIndicators": ["indicator1", "indicator2"],
                  "averageScore": 85
                },
                "examples": [
                  {
                    "title": "Example Application",
                    "strengths": ["what made this good"],
                    "score": 90
                  }
                ]
              }
            `
          ),
          maxTokens: 32000,
          temperature: 0.3,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Claude AI analysis timeout after 5 minutes. Please try processing again.')), 300000)
        )
      ]);

      if (response.success) {
        return JSON.parse(response.content.match(/\{[\s\S]*\}/)?.[0] || '{}');
      } else {
        return { status: 'failed', error: 'Claude analysis failed' };
      }
    } catch (error) {
      console.error('Error in good examples analysis:', error);
      // Re-throw to trigger fallback in the calling code
      throw error;
    }
  }

  /**
   * Analyze output template document using new Claude service
   */
  static async analyzeOutputTemplateDocument(content: string, filename: string): Promise<any> {
    try {
      // Add 30-second timeout protection to prevent infinite hangs
      const response = await Promise.race([
        claudeService.executeTask({
          task: 'analyze_output_template',
          prompt: ClaudeService.createFocusedPrompt(
            'Output Template Analysis',
            content,
            `
              Analyze this output template document to identify placeholders and structure.

              Extract information about:
              1. All placeholders in the format [placeholder] or {{placeholder}}
              2. Template structure and sections
              3. Required data fields
              4. Format requirements

              Do NOT include the full template content in your response - just analyze it.
            `,
            `
              Respond with valid JSON only:
              {
                "status": "completed",
                "useRawTemplate": true,
                "placeholders": ["[placeholder1]", "[placeholder2]"],
                "sections": ["Section 1", "Section 2"],
                "templateType": "assessment_report",
                "filename": "${filename}"
              }
            `
          ),
          maxTokens: 32000,
          temperature: 0.1,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Claude AI analysis timeout after 5 minutes. Please try processing again.')), 300000)
        )
      ]);

      if (response.success) {
        const analysis = JSON.parse(response.content.match(/\{[\s\S]*\}/)?.[0] || '{}');

        // Add the original content directly - this prevents truncation
        analysis.rawTemplateContent = content;
        analysis.originalContent = content;

        return analysis;
      } else {
        // Fallback: return basic analysis with original content
        return {
          status: 'completed',
          useRawTemplate: true,
          rawTemplateContent: content,
          originalContent: content,
          filename: filename,
          placeholders: this.extractPlaceholdersFromContent(content),
          error: 'Claude analysis failed, using fallback'
        };
      }
    } catch (error) {
      console.error('Error in output template analysis:', error);
      // Fallback: return basic analysis with original content
      return {
        status: 'completed',
        useRawTemplate: true,
        rawTemplateContent: content,
        originalContent: content,
        filename: filename,
        placeholders: this.extractPlaceholdersFromContent(content),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract placeholders from content using regex as fallback
   */
  private static extractPlaceholdersFromContent(content: string): string[] {
    const placeholderRegex = /\[([^\]]+)\]/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(content)) !== null) {
      const placeholder = `[${match[1]}]`;
      if (!placeholders.includes(placeholder)) {
        placeholders.push(placeholder);
      }
    }

    return placeholders;
  }
}