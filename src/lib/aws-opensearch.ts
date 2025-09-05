// AWS OpenSearch integration for vector database and semantic search
import { OpenSearchClient } from '@aws-sdk/client-opensearch';

// Initialize OpenSearch client
const openSearchClient = new OpenSearchClient({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.NOLIA_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NOLIA_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// OpenSearch configuration
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT || 'https://search-nolia-funding-rag.us-east-1.es.amazonaws.com';
const INDEX_NAME = 'funding-documents';

export interface DocumentVector {
  id: string;
  fundId: string;
  documentType: 'APPLICATION_FORM' | 'SELECTION_CRITERIA' | 'GOOD_EXAMPLES';
  filename: string;
  content: string;
  embedding: number[];
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
    const response = await fetch(`${OPENSEARCH_ENDPOINT}/${INDEX_NAME}/_doc/${document.id}`, {
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
        metadata: document.metadata,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to store document: ${response.statusText}`);
    }
    
    console.log(`Stored document vector: ${document.id}`);
    
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
  limit: number = 5
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
    
    const response = await fetch(`${OPENSEARCH_ENDPOINT}/${INDEX_NAME}/_search`, {
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
export async function initializeOpenSearchIndex(): Promise<void> {
  try {
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
    
    const response = await fetch(`${OPENSEARCH_ENDPOINT}/${INDEX_NAME}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await getOpenSearchAuth(),
      },
      body: JSON.stringify(indexMapping),
    });
    
    if (!response.ok && response.status !== 400) { // 400 = index already exists
      throw new Error(`Failed to create index: ${response.statusText}`);
    }
    
    console.log('OpenSearch index initialized successfully');
    
  } catch (error) {
    console.error('Error initializing OpenSearch index:', error);
    throw error;
  }
}

/**
 * Generate AWS signature for OpenSearch authentication
 */
async function getOpenSearchAuth(): Promise<string> {
  if (process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD) {
    // Use basic auth with master user
    const credentials = Buffer.from(`${process.env.OPENSEARCH_USERNAME}:${process.env.OPENSEARCH_PASSWORD}`).toString('base64');
    return `Basic ${credentials}`;
  }
  
  // Fallback to IAM-based auth (requires AWS SDK v3 signature)
  // For now, using basic auth - in production, implement AWS Signature v4
  return 'Basic ' + Buffer.from('admin:admin').toString('base64');
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
    // Return dummy embedding for development
    return new Array(1536).fill(0).map(() => Math.random() - 0.5);
  }
}