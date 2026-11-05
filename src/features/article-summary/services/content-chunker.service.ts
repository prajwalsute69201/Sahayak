/**
 * Sahayak Content Chunker Service
 * Handles long-article segmentation with semantic paragraph boundaries.
 */

export class ContentChunkerService {
  public static readonly DEFAULT_CHUNK_SIZE = 15000; // ~3,500 words
  public static readonly DEFAULT_OVERLAP = 500; // ~120 words
  public static readonly CHUNKING_THRESHOLD = 20000; // ~5,000 words

  /**
   * Determines if article text exceeds the standard single-pass threshold.
   */
  public shouldChunk(text: string, threshold = ContentChunkerService.CHUNKING_THRESHOLD): boolean {
    return text.length > threshold;
  }

  /**
   * Splits long text into chunks, preserving paragraph and sentence boundaries.
   */
  public chunkText(
    text: string,
    maxChunkSize = ContentChunkerService.DEFAULT_CHUNK_SIZE,
    overlap = ContentChunkerService.DEFAULT_OVERLAP
  ): string[] {
    if (!text || text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();
      if (!trimmedPara) continue;

      // If adding this paragraph exceeds maxChunkSize and currentChunk is non-empty
      if (currentChunk.length + trimmedPara.length + 2 > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());

        // Carry over overlap from the end of currentChunk
        const carryOver = currentChunk.slice(-overlap);
        currentChunk = carryOver + '\n\n' + trimmedPara;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

export const contentChunkerService = new ContentChunkerService();
export default contentChunkerService;
