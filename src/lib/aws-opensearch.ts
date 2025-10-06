// AWS OpenSearch integration for vector database and semantic search
import { OpenSearchClient } from '@aws-sdk/client-opensearch';
import { getAWSCredentials, AWS_REGION } from './aws-credentials';

// Initialize OpenSearch client with EXPLICIT IAM role credentials
// This bypasses ALL configuration files and SSO settings
const openSearchClient = new OpenSearchClient({
  region: AWS_REGION,
  credentials: getAWSCredentials(),
});

// OpenSearch configuration - REQUIRED (no fallback)
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT;
if (!OPENSEARCH_ENDPOINT) {
  throw new Error('OPENSEARCH_ENDPOINT environment variable is required. Please configure OpenSearch in .env.local or .env.production');
}

// Generate index name based on module type
function getIndexName(moduleType: 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' = 'FUNDING'): string {
  const indexMap = {
    'FUNDING': 'funding-documents',
    'PROCUREMENT': 'procurement-documents',
    'PROCUREMENT_ADMIN': 'procurement-admin-documents'
  };
  return indexMap[moduleType];
}

export interface DocumentVector {
  id: string;
  fundId: string;
  documentType: 'APPLICATION_FORM' | 'SELECTION_CRITERIA' | 'GOOD_EXAMPLES' | 'OUTPUT_TEMPLATES';
  filename: string;
  content: string;
  embedding: number[];
  moduleType?: 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN'; // For index routing
  metadata: {
    uploadedAt: string;
    fileSize: number;
    mimeType: string;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  documentType: string;
  filename: string;
  metadata: any;
}

/**
 * Store document vector in OpenSearch
 */
export async function storeDocumentVector(document: DocumentVector): Promise<void> {
  try {
    const indexName = getIndexName(document.moduleType || 'FUNDING');
    const response = await fetch(`${OPENSEARCH_ENDPOINT}/${indexName}/_doc/${document.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await getOpenSearchAuth(),
      },
      body: JSON.stringify({
        fundId: document.fundId,
        documentType: document.documentType,
        filename: document.filename,
        content: document.content,
        embedding: document.embedding,
        moduleType: document.moduleType || 'FUNDING',
        metadata: document.metadata,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to store document: ${response.statusText} - ${errorText}`);
    }

    console.log(`Stored document vector in ${indexName}: ${document.id}`);

  } catch (error) {
    console.error('Error storing document vector:', error);
    throw error;
  }
}

/**
 * Search for relevant documents using vector similarity
 */
export async function searchRelevantDocuments(
  queryEmbedding: number[],
  fundId: string,
  documentTypes?: string[],
  limit: number = 5,
  moduleType: 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' = 'FUNDING'
): Promise<SearchResult[]> {
  try {
    const mustClauses = [
      {
        term: { fundId }
      }
    ];
    
    if (documentTypes && documentTypes.length > 0) {
      mustClauses.push({
        terms: { documentType: documentTypes }
      } as any);
    }
    
    const query = {
      size: limit,
      query: {
        bool: {
          must: mustClauses,
          should: [
            {
              knn: {
                embedding: {
                  vector: queryEmbedding,
                  k: limit
                }
              }
            }
          ]
        }
      },
      _source: ['fundId', 'documentType', 'filename', 'content', 'metadata']
    };
    
    const indexName = getIndexName(moduleType);
    const response = await fetch(`${OPENSEARCH_ENDPOINT}/${indexName}/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await getOpenSearchAuth(),
      },
      body: JSON.stringify(query),
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    const searchResponse = await response.json();
    
    return searchResponse.hits.hits.map((hit: any) => ({
      id: hit._id,
      score: hit._score,
      content: hit._source.content,
      documentType: hit._source.documentType,
      filename: hit._source.filename,
      metadata: hit._source.metadata,
    }));
    
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

/**
 * Get all selection criteria for a fund
 */
export async function getFundCriteria(fundId: string): Promise<SearchResult[]> {
  return searchRelevantDocuments(
    new Array(1536).fill(0), // Dummy embedding for exact match
    fundId,
    ['SELECTION_CRITERIA'],
    10
  );
}

/**
 * Get good examples for a fund
 */
export async function getFundGoodExamples(fundId: string): Promise<SearchResult[]> {
  return searchRelevantDocuments(
    new Array(1536).fill(0), // Dummy embedding for exact match
    fundId,
    ['GOOD_EXAMPLES'],
    5
  );
}

/**
 * Initialize OpenSearch index with proper mappings
 */
export async function initializeOpenSearchIndex(moduleType: 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' = 'FUNDING'): Promise<void> {
  try {
    const indexName = getIndexName(moduleType);
    const indexMapping = {
      mappings: {
        properties: {
          fundId: { type: 'keyword' },
          documentType: { type: 'keyword' },
          filename: { type: 'text' },
          content: { type: 'text' },
          embedding: {
            type: 'knn_vector',
            dimension: 1536, // OpenAI embedding dimension
          },
          moduleType: { type: 'keyword' },
          metadata: {
            properties: {
              uploadedAt: { type: 'date' },
              fileSize: { type: 'integer' },
              mimeType: { type: 'keyword' },
            }
          },
          timestamp: { type: 'date' }
        }
      },
      settings: {
        index: {
          knn: true,
          'knn.algo_param.ef_search': 100,
        }
      }
    };

    const response = await fetch(`${OPENSEARCH_ENDPOINT}/${indexName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await getOpenSearchAuth(),
      },
      body: JSON.stringify(indexMapping),
    });

    if (!response.ok && response.status !== 400) { // 400 = index already exists
      const errorText = await response.text();
      throw new Error(`Failed to create index ${indexName}: ${response.statusText} - ${errorText}`);
    }

    console.log(`OpenSearch index ${indexName} initialized successfully`);

  } catch (error) {
    console.error('Error initializing OpenSearch index:', error);
    throw error;
  }
}

/**
 * Generate AWS signature for OpenSearch authentication
 */
async function getOpenSearchAuth(): Promise<string> {
  if (!process.env.OPENSEARCH_USERNAME || !process.env.OPENSEARCH_PASSWORD) {
    throw new Error('OpenSearch credentials not configured. Set OPENSEARCH_USERNAME and OPENSEARCH_PASSWORD in .env.local or .env.production');
  }

  // Use basic auth with master user
  const credentials = Buffer.from(`${process.env.OPENSEARCH_USERNAME}:${process.env.OPENSEARCH_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Generate embeddings using AWS Titan or OpenAI (placeholder implementation)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Option 1: Use AWS Titan Embeddings (recommended for AWS)
    // const titanResponse = await bedrockClient.send(new InvokeModelCommand({...}));
    
    // Option 2: Use OpenAI embeddings (fallback)
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate embedding');
    }
    
    const data = await response.json();
    return data.data[0].embedding;

  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}. Ensure OPENAI_API_KEY is configured.`);
  }
}