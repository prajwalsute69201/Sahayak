/**
 * Timestamp-Preserving Transcript Chunking Service
 * Segments long transcripts into bounded chunks while retaining exact timing metadata.
 */

import { TranscriptSegment } from '../types/youtube.types';
import { formatSecondsToTimestamp } from './youtube-detector.service';
import { formatTranscriptForPrompt } from './transcript-cleaner.service';

export interface TranscriptChunk {
  chunkIndex: number;
  totalChunks: number;
  startSeconds: number;
  endSeconds: number;
  startTime: string;
  endTime: string;
  segments: TranscriptSegment[];
  formattedText: string;
}

// 25,000 chars is roughly 5,000-6,000 tokens, well within Gemini Flash-Lite context while retaining precision
export const DEFAULT_MAX_CHUNK_CHARS = 25000;

/**
 * Splits transcript segments into structured chunks with preserved timestamps.
 */
export function chunkTranscript(
  segments: TranscriptSegment[],
  maxCharsPerChunk: number = DEFAULT_MAX_CHUNK_CHARS
): TranscriptChunk[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  const chunksData: Array<{ segments: TranscriptSegment[] }> = [];
  let currentSegments: TranscriptSegment[] = [];
  let currentLength = 0;

  for (const segment of segments) {
    const lineLength = segment.text.length + segment.timestamp.length + 5; // e.g. "[01:23] text\n"

    // If adding this segment exceeds chunk limit and current chunk has content, create new chunk
    if (currentLength + lineLength > maxCharsPerChunk && currentSegments.length > 0) {
      chunksData.push({ segments: [...currentSegments] });
      currentSegments = [];
      currentLength = 0;
    }

    currentSegments.push(segment);
    currentLength += lineLength;
  }

  if (currentSegments.length > 0) {
    chunksData.push({ segments: currentSegments });
  }

  const totalChunks = chunksData.length;

  return chunksData.map((chunk, idx) => {
    const firstSeg = chunk.segments[0];
    const lastSeg = chunk.segments[chunk.segments.length - 1];

    const startSeconds = firstSeg ? firstSeg.startSeconds : 0;
    const endSeconds = lastSeg ? lastSeg.startSeconds + lastSeg.durationSeconds : 0;

    return {
      chunkIndex: idx + 1,
      totalChunks,
      startSeconds,
      endSeconds,
      startTime: formatSecondsToTimestamp(startSeconds),
      endTime: formatSecondsToTimestamp(endSeconds),
      segments: chunk.segments,
      formattedText: formatTranscriptForPrompt(chunk.segments),
    };
  });
}
