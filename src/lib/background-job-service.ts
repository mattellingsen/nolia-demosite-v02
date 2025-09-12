// Background job processing service for RAG and document analysis
import { prisma } from './database-s3';
import { extractTextFromFile, analyzeApplicationForm, analyzeSelectionCriteria } from '../utils/server-document-analyzer';
import { storeDocumentVector, generateEmbedding } from './aws-opensearch';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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
      
      const documents = fund.documents;
      const totalDocuments = documents.length;
      
      await this.updateJob(jobId, {
        totalDocuments,
        progress: 5
      });
      
      console.log(`Processing ${totalDocuments} documents for RAG indexing`);
      
      // Process each document
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        
        try {
          console.log(`Processing document ${i + 1}/${totalDocuments}: ${document.filename}`);
          
          // Extract text from S3
          const documentText = await this.extractTextFromS3Document(document.s3Key);
          
          // Skip if no meaningful text (but don't fail the job)
          if (documentText.length < 10) {
            console.log(`Skipping document ${document.filename} - insufficient text content`);
            continue;
          }
          
          // Generate embedding
          const embedding = await generateEmbedding(documentText);
          
          // Store in OpenSearch
          await storeDocumentVector({
            id: document.id,
            fundId: fund.id,
            documentType: document.documentType,
            filename: document.filename,
            content: documentText,
            embedding,
            metadata: {
              uploadedAt: document.uploadedAt.toISOString(),
              fileSize: document.fileSize,
              mimeType: document.mimeType,
            },
          });
          
          // Update progress
          const processedDocuments = i + 1;
          const progress = Math.min(95, Math.round((processedDocuments / totalDocuments) * 90) + 5);
          
          await this.updateJob(jobId, {
            processedDocuments,
            progress
          });
          
          console.log(`Successfully processed document ${processedDocuments}/${totalDocuments}`);
          
        } catch (docError) {
          console.error(`Error processing document ${document.filename}:`, docError);
          // Continue with other documents instead of failing entire job
        }
      }
      
      // Mark job as completed
      await this.updateJob(jobId, {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date()
      });
      
      console.log(`RAG job ${jobId} completed successfully`);
      
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
            analysis = await analyzeApplicationForm(file);
          } else {
            analysis = await analyzeSelectionCriteria([file]);
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
      
      console.log(`Async job ${jobId} completed successfully`);
      
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
    
    // Check if analysis already exists
    if (fund.applicationFormAnalysis?.status !== 'pending_analysis' && 
        fund.selectionCriteriaAnalysis?.status !== 'pending_analysis' &&
        fund.goodExamplesAnalysis?.status !== 'pending_analysis') {
      console.log('Document analysis already complete for fund', fundId);
      return;
    }
    
    console.log('Performing document analysis for fund', fundId);
    
    // Get documents grouped by type
    const applicationFormDocs = fund.documents.filter(d => d.documentType === 'APPLICATION_FORM');
    const selectionCriteriaDocs = fund.documents.filter(d => d.documentType === 'SELECTION_CRITERIA');
    const goodExamplesDocs = fund.documents.filter(d => d.documentType === 'GOOD_EXAMPLES');
    
    let applicationFormAnalysis = fund.applicationFormAnalysis;
    let selectionCriteriaAnalysis = fund.selectionCriteriaAnalysis;
    let goodExamplesAnalysis = fund.goodExamplesAnalysis;
    
    // Analyze application form
    if (applicationFormDocs.length > 0 && fund.applicationFormAnalysis?.status === 'pending_analysis') {
      try {
        const doc = applicationFormDocs[0];
        const text = await this.extractTextFromS3Document(doc.s3Key);
        const fileBlob = new Blob([text], { type: 'text/plain' });
        const file = new File([fileBlob], doc.filename, { type: doc.mimeType });
        applicationFormAnalysis = await analyzeApplicationForm(file);
      } catch (error) {
        console.error('Error analyzing application form:', error);
      }
    }
    
    // Analyze selection criteria
    if (selectionCriteriaDocs.length > 0 && fund.selectionCriteriaAnalysis?.status === 'pending_analysis') {
      try {
        const files = await Promise.all(
          selectionCriteriaDocs.map(async (doc) => {
            const text = await this.extractTextFromS3Document(doc.s3Key);
            const fileBlob = new Blob([text], { type: 'text/plain' });
            return new File([fileBlob], doc.filename, { type: doc.mimeType });
          })
        );
        selectionCriteriaAnalysis = await analyzeSelectionCriteria(files);
      } catch (error) {
        console.error('Error analyzing selection criteria:', error);
      }
    }
    
    // Analyze good examples
    if (goodExamplesDocs.length > 0 && fund.goodExamplesAnalysis?.status === 'pending_analysis') {
      try {
        const files = await Promise.all(
          goodExamplesDocs.map(async (doc) => {
            const text = await this.extractTextFromS3Document(doc.s3Key);
            const fileBlob = new Blob([text], { type: 'text/plain' });
            return new File([fileBlob], doc.filename, { type: doc.mimeType });
          })
        );
        goodExamplesAnalysis = await analyzeSelectionCriteria(files);
      } catch (error) {
        console.error('Error analyzing good examples:', error);
      }
    }
    
    // Update fund with analysis results
    await prisma.fund.update({
      where: { id: fundId },
      data: {
        applicationFormAnalysis,
        selectionCriteriaAnalysis,
        goodExamplesAnalysis
      }
    });
    
    console.log('Document analysis complete for fund', fundId);
  }
  
  /**
   * Extract text from S3 document
   */
  private static async extractTextFromS3Document(s3Key: string): Promise<string> {
    const s3Client = new S3Client({
      region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
      // Force IAM Role in production by not providing credentials if they start with ASIA
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
    
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_DOCUMENTS,
      Key: s3Key,
    });
    
    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error('No content in S3 object');
    }
    
    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const buffer = Buffer.concat(chunks);
    
    // Create a File-like object for the document analyzer
    const fileBlob = new File([buffer], s3Key.split('/').pop() || 'document', {
      type: response.ContentType || 'application/octet-stream'
    });
    
    return await extractTextFromFile(fileBlob);
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
      }
      // Add other job types here as needed
      
      return true;
    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);
      return false;
    }
  }
}