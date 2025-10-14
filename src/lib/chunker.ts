/**
 * Chunking utility for large document processing
 *
 * Splits large text into smaller chunks to avoid Lambda timeouts during AI processing.
 * Preserves paragraph boundaries to maintain document structure and context.
 */

export interface TextChunk {
  index: number;
  text: string;
  charCount: number;
}

/**
 * Split text into chunks that preserve paragraph boundaries
 *
 * @param text - The text to chunk
 * @param maxChunkSize - Maximum characters per chunk (default: 30000)
 * @returns Array of chunks with metadata
 */
export function chunkText(text: string, maxChunkSize: number = 30000): TextChunk[] {
  // Handle empty or very small strings
  if (!text || text.trim().length === 0) {
    return [];
  }

  if (text.length <= maxChunkSize) {
    return [{
      index: 0,
      text: text,
      charCount: text.length
    }];
  }

  // Split into paragraphs (double newline is common paragraph separator)
  const paragraphs = text.split(/\n\n+/);

  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const paragraphWithSeparator = i < paragraphs.length - 1
      ? paragraph + '\n\n'  // Add back the separator except for last paragraph
      : paragraph;

    // If a single paragraph is larger than maxChunkSize, we need to split it
    if (paragraphWithSeparator.length > maxChunkSize) {
      // First, save current chunk if it has content
      if (currentChunk.trim().length > 0) {
        chunks.push({
          index: chunkIndex++,
          text: currentChunk.trim(),
          charCount: currentChunk.trim().length
        });
        currentChunk = '';
      }

      // Split the large paragraph by sentences (period followed by space or newline)
      const sentences = paragraphWithSeparator.split(/(?<=[.!?])\s+/);

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
          // Save current chunk
          if (currentChunk.trim().length > 0) {
            chunks.push({
              index: chunkIndex++,
              text: currentChunk.trim(),
              charCount: currentChunk.trim().length
            });
          }
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
      continue;
    }

    // Check if adding this paragraph would exceed the limit
    if (currentChunk.length + paragraphWithSeparator.length > maxChunkSize) {
      // Save current chunk and start new one
      chunks.push({
        index: chunkIndex++,
        text: currentChunk.trim(),
        charCount: currentChunk.trim().length
      });
      currentChunk = paragraphWithSeparator;
    } else {
      // Add paragraph to current chunk
      currentChunk += paragraphWithSeparator;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      index: chunkIndex,
      text: currentChunk.trim(),
      charCount: currentChunk.trim().length
    });
  }

  return chunks;
}
