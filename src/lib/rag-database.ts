// RAG-enhanced database service combining S3, PostgreSQL, OpenSearch, and Bedrock
import { prisma } from './database-s3';
import { extractTextFromFile } from '../utils/server-document-analyzer';
import { storeDocumentVector, generateEmbedding, searchRelevantDocuments, getFundCriteria, getFundGoodExamples } from './aws-opensearch';
import { assessApplicationWithBedrock, type RAGContext, type AssessmentRequest } from './aws-bedrock';
// import { uploadFileToS3 } from './database-s3'; // Not needed for current implementation

/**
 * Enhanced fund creation with RAG vector storage
 */
export async function saveFundWithRAG(fundData: {
  name: string;
  description?: string;
  applicationForm?: {
    file: Buffer;
    filename: string;
    mimeType: string;
    analysis: any;
  };
  selectionCriteria?: Array<{
    file: Buffer;
    filename: string;
    mimeType: string;
  }>;
  selectionCriteriaAnalysis?: any;
  goodExamples?: Array<{
    file: Buffer;
    filename: string;
    mimeType: string;
  }>;
  goodExamplesAnalysis?: any;
}) {
  // First, create the fund in PostgreSQL (existing functionality)
  const { saveFundWithDocuments } = await import('./database-s3');
  const fund = await saveFundWithDocuments(fundData);
  
  // Then, process documents for RAG storage
  await processDocumentsForRAG(fund);
  
  return fund;
}

/**
 * Process uploaded documents for RAG vector storage
 */
async function processDocumentsForRAG(fund: any): Promise<void> {
  try {
    console.log(`Processing documents for RAG storage - Fund: ${fund.id}`);
    
    // Process each document type for vector storage
    for (const document of fund.documents) {
      // Extract text from S3 document
      const documentText = await extractTextFromS3Document(document.s3Key);
      
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
    }
    
    console.log(`Successfully processed ${fund.documents.length} documents for RAG`);
    
  } catch (error) {
    console.error('Error processing documents for RAG:', error);
    // Don't fail the entire fund creation if RAG processing fails
  }
}

/**
 * Extract text from S3 document using existing document analyzer
 */
async function extractTextFromS3Document(s3Key: string): Promise<string> {
  try {
    // Download from S3
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-2',
      // Use explicit credentials if available (local dev), otherwise use IAM Role (production)
      ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
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
    const buffer = Buffer.from(await response.Body!.transformToByteArray());
    
    // Create a temporary File object for text extraction
    const mimeType = s3Key.includes('.pdf') ? 'application/pdf' : 
                     s3Key.includes('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                     'text/plain';
                     
    const tempFile = new File([buffer], s3Key.split('/').pop() || 'document', { type: mimeType });
    
    // Extract text using existing analyzer
    return await extractTextFromFile(tempFile);
    
  } catch (error) {
    console.error('Error extracting text from S3 document:', error);
    return 'Error extracting text from document';
  }
}

/**
 * RAG-powered application assessment
 */
export async function assessApplicationWithRAG(
  applicationText: string,
  fundId: string,
  assessmentType: 'eligibility' | 'scoring' | 'guidance' = 'scoring'
) {
  try {
    // Generate embedding for the application
    const applicationEmbedding = await generateEmbedding(applicationText);
    
    // Retrieve relevant context using RAG
    const [relevantDocuments, criteriaDocuments, goodExamples] = await Promise.all([
      searchRelevantDocuments(applicationEmbedding, fundId, undefined, 3),
      getFundCriteria(fundId),
      getFundGoodExamples(fundId),
    ]);
    
    // Build RAG context
    const ragContext: RAGContext = {
      relevantDocuments: relevantDocuments.map(doc => doc.content),
      criteriaText: criteriaDocuments.map(doc => doc.content).join('\n\n'),
      goodExamples: goodExamples.map(doc => doc.content),
    };
    
    // Assess using Bedrock Claude with RAG context
    const assessmentRequest: AssessmentRequest = {
      applicationText,
      context: ragContext,
      assessmentType,
    };
    
    return await assessApplicationWithBedrock(assessmentRequest);
    
  } catch (error) {
    console.error('Error in RAG application assessment:', error);
    throw new Error(`RAG assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get AI-powered guidance for application improvement
 */
export async function getApplicationGuidance(
  applicationText: string,
  fundId: string
) {
  return assessApplicationWithRAG(applicationText, fundId, 'guidance');
}

/**
 * Batch process multiple applications for assessment
 */
export async function batchAssessApplications(
  applications: Array<{
    id: string;
    text: string;
  }>,
  fundId: string
) {
  const results = [];
  
  for (const app of applications) {
    try {
      const assessment = await assessApplicationWithRAG(app.text, fundId, 'scoring');
      results.push({
        applicationId: app.id,
        assessment,
        status: 'success',
      });
    } catch (error) {
      results.push({
        applicationId: app.id,
        assessment: null,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

/**
 * Search for similar applications (for good examples discovery)
 */
export async function findSimilarApplications(
  applicationText: string,
  fundId?: string,
  limit: number = 5
) {
  try {
    const embedding = await generateEmbedding(applicationText);
    
    return await searchRelevantDocuments(
      embedding,
      fundId || '*', // Search across all funds if no fundId specified
      ['GOOD_EXAMPLES'],
      limit
    );
  } catch (error) {
    console.error('Error finding similar applications:', error);
    return [];
  }
}

/**
 * Update RAG vectors when document content changes
 */
export async function updateDocumentRAG(documentId: string, newContent: string) {
  try {
    const document = await prisma.fundDocument.findUnique({
      where: { id: documentId },
      include: { fund: true }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Generate new embedding
    const embedding = await generateEmbedding(newContent);
    
    // Update in OpenSearch
    await storeDocumentVector({
      id: document.id,
      fundId: document.fundId,
      documentType: document.documentType,
      filename: document.filename,
      content: newContent,
      embedding,
      metadata: {
        uploadedAt: document.uploadedAt.toISOString(),
        fileSize: document.fileSize,
        mimeType: document.mimeType,
      },
    });
    
    console.log(`Updated RAG vectors for document: ${documentId}`);
    
  } catch (error) {
    console.error('Error updating document RAG:', error);
    throw error;
  }
}