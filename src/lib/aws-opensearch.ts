// AWS OpenSearch integration for vector database and semantic search
import { OpenSearchClient } from '@aws-sdk/client-opensearch';
import { getAWSCredentials, AWS_REGION } from './aws-credentials';
import { getEncoding } from 'js-tiktoken';

// Initialize OpenSearch client with EXPLICIT IAM role credentials
// This bypasses ALL configuration files and SSO settings
const openSearchClient = new OpenSearchClient({
  region: AWS_REGION,
  credentials: getAWSCredentials(),
});

// OpenSearch configuration - REQUIRED (no fallback)
// Lazy evaluation to avoid build-time errors
function getOpenSearchEndpoint(): string {
  const endpoint = process.env.OPENSEARCH_ENDPOINT;
  if (!endpoint) {
    throw new Error('OPENSEARCH_ENDPOINT environment variable is required. Please configure OpenSearch in .env.local or .env.production');
  }
  return endpoint;
}

// Generate index name based on module type
function getIndexName(moduleType: 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' | 'WORLDBANK' | 'WORLDBANK_ADMIN' = 'FUNDING'): string {
  const indexMap = {
    'FUNDING': 'funding-documents',
    'PROCUREMENT': 'procurement-documents',
    'PROCUREMENT_ADMIN': 'procurement-admin-documents',
    'WORLDBANK': 'worldbank-documents',
    'WORLDBANK_ADMIN': 'worldbank-admin-documents'
  };
  return indexMap[moduleType];
}

/**
 * Split text into chunks based on ACTUAL token count (not estimation)
 * Uses tiktoken to count tokens accurately for OpenAI models
 *
 * @param text - The text to chunk
 * @param maxTokens - Maximum tokens per chunk (default 7000, safe buffer under 8192 limit)
 * @param overlapTokens - Number of tokens to overlap between chunks (default 300)
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  maxTokens: number = 7000,
  overlapTokens: number = 300
): string[] {
  const encoder = getEncoding('cl100k_base'); // Use cl100k_base for text-embedding-3-small compatibility

  try {
    const tokens = encoder.encode(text);
    const totalTokens = tokens.length;

    // If text fits in one chunk, return as-is
    if (totalTokens <= maxTokens) {
      return [text];
    }

    const chunks: string[] = [];
    const step = maxTokens - overlapTokens;

    for (let i = 0; i < totalTokens; i += step) {
      const endIndex = Math.min(i + maxTokens, totalTokens);
      const chunkTokens = tokens.slice(i, endIndex);
      // js-tiktoken's decode() returns a string directly (no TextDecoder needed)
      const chunkText = encoder.decode(chunkTokens);

      chunks.push(chunkText);

      // Stop if we've reached the end
      if (endIndex >= totalTokens) {
        break;
      }
    }

    return chunks;

  } finally {
    // Note: js-tiktoken doesn't require manual memory management (pure JavaScript)
    // No need to free encoder
  }
}

export interface DocumentVector {
  id: string;  // documentId OR documentId-chunk-N for chunked documents
  fundId: string;
  documentType: 'APPLICATION_FORM' | 'SELECTION_CRITERIA' | 'GOOD_EXAMPLES' | 'OUTPUT_TEMPLATES';
  filename: string;
  content: string;
  embedding: number[];
  moduleType?: 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' | 'WORLDBANK' | 'WORLDBANK_ADMIN'; // For index routing
  metadata: {
    uploadedAt: string;
    fileSize: number;
    mimeType: string;
    // Chunk-specific fields (only present for chunked documents)
    originalDocumentId?: string;  // Database document ID (parent document)
    chunkIndex?: number;          // 1-based index (1, 2, 3...)
    totalChunks?: number;         // Total number of chunks for this document
    isChunk?: boolean;            // true for chunks, undefined for legacy single documents
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
    const response = await fetch(`${getOpenSearchEndpoint()}/${indexName}/_doc/${document.id}`, {
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
  moduleType: 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' | 'WORLDBANK' | 'WORLDBANK_ADMIN' = 'FUNDING'
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
    const response = await fetch(`${getOpenSearchEndpoint()}/${indexName}/_search`, {
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
export async function initializeOpenSearchIndex(moduleType: 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' | 'WORLDBANK' | 'WORLDBANK_ADMIN' = 'FUNDING'): Promise<void> {
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

    const response = await fetch(`${getOpenSearchEndpoint()}/${indexName}`, {
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
    const apiKey = process.env.OPENAI_API_KEY;

    // Debug logging
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY is not set in environment');
      console.error('   Available env vars starting with OPEN:',
        Object.keys(process.env).filter(k => k.startsWith('OPEN')));
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    console.log(`🔄 Generating embedding for text (${text.length} chars) with API key: ${apiKey.substring(0, 10)}...`);

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error: ${response.status} ${response.statusText}`);
      console.error(`   Error details: ${errorText}`);
      throw new Error(`OpenAI API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Successfully generated embedding (dimension: ${data.data[0].embedding.length})`);
    return data.data[0].embedding;

  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}. Ensure OPENAI_API_KEY is configured.`);
  }
}

/**
 * Validate that embeddings were successfully created for a fund
 * Returns the count of embeddings and sample data
 */
export async function validateFundEmbeddings(
  fundId: string,
  moduleType: 'FUNDING' | 'PROCUREMENT' | 'PROCUREMENT_ADMIN' | 'WORLDBANK' | 'WORLDBANK_ADMIN' = 'FUNDING'
): Promise<{
  count: number;
  indexName: string;
  sample?: Array<{
    id: string;
    filename: string;
    hasEmbedding: boolean;
    isChunk: boolean;
  }>;
}> {
  try {
    const indexName = getIndexName(moduleType);

    // Count embeddings for this fund
    const countResponse = await fetch(`${getOpenSearchEndpoint()}/${indexName}/_count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await getOpenSearchAuth(),
      },
      body: JSON.stringify({
        query: {
          term: { fundId }
        }
      }),
    });

    if (!countResponse.ok) {
      const errorText = await countResponse.text();
      console.warn(`⚠️ Could not validate embeddings for fund ${fundId}: ${errorText}`);
      return { count: 0, indexName, sample: [] };
    }

    const countData = await countResponse.json();
    const count = countData.count || 0;

    console.log(`📊 Validation: Found ${count} embeddings for fund ${fundId} in index ${indexName}`);

    // Get sample documents if any exist
    let sample = [];
    if (count > 0) {
      const sampleResponse = await fetch(`${getOpenSearchEndpoint()}/${indexName}/_search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': await getOpenSearchAuth(),
        },
        body: JSON.stringify({
          query: {
            term: { fundId }
          },
          size: 3,
          _source: ['filename', 'embedding', 'metadata']
        }),
      });

      if (sampleResponse.ok) {
        const sampleData = await sampleResponse.json();
        sample = sampleData.hits.hits.map((hit: any) => ({
          id: hit._id,
          filename: hit._source.filename,
          hasEmbedding: !!hit._source.embedding,
          isChunk: hit._source.metadata?.isChunk || false
        }));
      }
    }

    return { count, indexName, sample };
  } catch (error) {
    console.error(`Error validating embeddings for fund ${fundId}:`, error);
    // Return zero count on error - don't fail validation
    return { count: 0, indexName: getIndexName(moduleType), sample: [] };
  }
}