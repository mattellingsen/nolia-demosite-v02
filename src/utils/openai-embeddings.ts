// OpenAI Embeddings Service
// Uses OpenAI for text embeddings and semantic similarity (not reasoning)

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key'
});

/**
 * Generate text embeddings using OpenAI's superior embedding model
 * Used for semantic similarity and text vectorization
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo-key') {
    throw new Error('OpenAI API key not configured for embeddings');
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large", // Best OpenAI embedding model
      input: text.substring(0, 8000), // Limit to token constraints
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  const dotProduct = embedding1.reduce((sum, a, i) => sum + a * embedding2[i], 0);
  const magnitude1 = Math.sqrt(embedding1.reduce((sum, a) => sum + a * a, 0));
  const magnitude2 = Math.sqrt(embedding2.reduce((sum, a) => sum + a * a, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Find similar text chunks using embeddings
 */
export async function findSimilarChunks(
  queryText: string, 
  textChunks: string[], 
  topK: number = 5
): Promise<Array<{ text: string; similarity: number; index: number }>> {
  
  const queryEmbedding = await generateEmbedding(queryText);
  const chunkEmbeddings = await Promise.all(
    textChunks.map(chunk => generateEmbedding(chunk))
  );
  
  const similarities = chunkEmbeddings.map((embedding, index) => ({
    text: textChunks[index],
    similarity: cosineSimilarity(queryEmbedding, embedding),
    index
  }));
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
