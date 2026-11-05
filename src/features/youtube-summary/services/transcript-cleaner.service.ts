/**
 * Transcript Cleaner & Normalizer Service
 * Cleans YouTube captions, decodes entities, removes ASR artifacts, and merges fragmented lines.
 */

import { TranscriptSegment } from '../types/youtube.types';
import { formatSecondsToTimestamp } from './youtube-detector.service';

/**
 * Decodes standard HTML entities commonly found in YouTube caption tracks.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * Strips non-verbal audio markers like [Music], [Applause], (laughter), etc.
 */
export function stripAudioNoiseMarkers(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[(?:music|applause|laughter|screaming|cheering|chuckle|snicker|sigh|groan)\]/gi, '')
    .replace(/\((?:music|applause|laughter|cheering)\)/gi, '')
    .replace(/♪[^♪]*♪/g, '') // remove text enclosed in musical notes
    .replace(/[♪♫#]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Detects and removes trailing/leading duplicate phrases between adjacent ASR segments.
 * YouTube auto-generated captions often roll over the last few words of the previous line.
 */
export function deduplicateAdjacentText(prevText: string, currentText: string): string {
  if (!prevText || !currentText) return currentText;

  const prevWords = prevText.toLowerCase().split(/\s+/);
  const currWords = currentText.toLowerCase().split(/\s+/);
  const rawCurrWords = currentText.split(/\s+/);

  // Check overlap of 1 to 4 words from end of prev to start of curr
  const maxOverlap = Math.min(4, prevWords.length, currWords.length);
  for (let len = maxOverlap; len >= 1; len--) {
    const prevSlice = prevWords.slice(-len).join(' ');
    const currSlice = currWords.slice(0, len).join(' ');
    if (prevSlice === currSlice) {
      // Overlap matched, remove duplicate words from start of current
      return rawCurrWords.slice(len).join(' ');
    }
  }

  return currentText;
}

/**
 * Cleans and normalizes an individual segment.
 */
export function cleanSegmentText(rawText: string): string {
  const decoded = decodeHtmlEntities(rawText);
  const stripped = stripAudioNoiseMarkers(decoded);
  return stripped;
}

/**
 * Normalizes an array of raw transcript segments:
 * 1. Decodes HTML entities and strips audio artifacts.
 * 2. Filters out empty segments.
 * 3. Removes rolling duplicate words.
 * 4. Merges rapid fragmented segments within a time window (e.g. < 2.5s) into complete sentences.
 * 5. Generates standardized timestamps.
 */
export function cleanAndMergeTranscript(
  rawSegments: Array<{ start: number; dur?: number; text: string }>,
  mergeWindowSeconds: number = 3.0
): TranscriptSegment[] {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
    return [];
  }

  const cleanedRaw: Array<{ start: number; dur: number; text: string }> = [];
  let lastText = '';

  for (const seg of rawSegments) {
    const cleaned = cleanSegmentText(seg.text);
    if (!cleaned) continue;

    const deduped = deduplicateAdjacentText(lastText, cleaned);
    if (!deduped || deduped.trim().length === 0) continue;

    cleanedRaw.push({
      start: Math.max(0, seg.start || 0),
      dur: Math.max(0, seg.dur || 0),
      text: deduped,
    });
    lastText = deduped;
  }

  if (cleanedRaw.length === 0) return [];

  // Merge rapid fragments into cohesive segments
  const merged: TranscriptSegment[] = [];
  let currentGroup = {
    startSeconds: cleanedRaw[0].start,
    durationSeconds: cleanedRaw[0].dur,
    texts: [cleanedRaw[0].text],
  };

  for (let i = 1; i < cleanedRaw.length; i++) {
    const seg = cleanedRaw[i];
    const prevEnd = currentGroup.startSeconds + currentGroup.durationSeconds;
    const timeGap = seg.start - prevEnd;
    const currentCombinedText = currentGroup.texts.join(' ');

    // Merge if time gap is small and current sentence isn't finalized with . / ? / !
    const isSentenceEnd = /[.!?]$/.test(currentCombinedText.trim());
    const shouldMerge =
      timeGap <= mergeWindowSeconds && (!isSentenceEnd || currentCombinedText.length < 80);

    if (shouldMerge) {
      currentGroup.texts.push(seg.text);
      currentGroup.durationSeconds = seg.start + seg.dur - currentGroup.startSeconds;
    } else {
      merged.push({
        startSeconds: Math.round(currentGroup.startSeconds * 10) / 10,
        durationSeconds: Math.round(currentGroup.durationSeconds * 10) / 10,
        timestamp: formatSecondsToTimestamp(currentGroup.startSeconds),
        text: currentGroup.texts
          .join(' ')
          .replace(/\s{2,}/g, ' ')
          .trim(),
      });

      currentGroup = {
        startSeconds: seg.start,
        durationSeconds: seg.dur,
        texts: [seg.text],
      };
    }
  }

  // Push the final group
  merged.push({
    startSeconds: Math.round(currentGroup.startSeconds * 10) / 10,
    durationSeconds: Math.round(currentGroup.durationSeconds * 10) / 10,
    timestamp: formatSecondsToTimestamp(currentGroup.startSeconds),
    text: currentGroup.texts
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim(),
  });

  return merged;
}

/**
 * Formats transcript segments into a readable text document with timestamps.
 * Suitable for LLM context ingestion.
 */
export function formatTranscriptForPrompt(segments: TranscriptSegment[]): string {
  if (!segments || segments.length === 0) return '';
  return segments.map((seg) => `[${seg.timestamp}] ${seg.text}`).join('\n');
}
