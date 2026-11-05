/**
 * Selection Service
 * Captures, sanitizes, and validates user text selections from web pages.
 */

import { SelectionValidationResult } from '../types/context-menu.types';

export class SelectionService {
  public static readonly MAX_RECOMMENDED_CHARS = 25000; // ~5,000 words
  public static readonly MAX_ALLOWED_CHARS = 50000; // Hard cutoff threshold

  /**
   * Sanitizes selection text by stripping zero-width and non-printable control characters.
   */
  public sanitizeSelectionText(text: string): string {
    if (!text || typeof text !== 'string') return '';

    // Strip zero-width spaces & joiners
    const stripped = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Strip non-printable control characters without triggering regex lint rule
    let cleanChars = '';
    for (let i = 0; i < stripped.length; i++) {
      const code = stripped.charCodeAt(i);
      // Exclude ASCII control characters 0-8, 11-12, 14-31, 127
      if (
        (code >= 0 && code <= 8) ||
        code === 11 ||
        code === 12 ||
        (code >= 14 && code <= 31) ||
        code === 127
      ) {
        continue;
      }
      cleanChars += stripped[i];
    }

    return cleanChars
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Validates and evaluates selection text quality and length boundaries.
   */
  public validateSelection(rawText?: string): SelectionValidationResult {
    const clean = this.sanitizeSelectionText(rawText || '');

    if (!clean || clean.length === 0) {
      return {
        isValid: false,
        cleanText: '',
        wordCount: 0,
        charCount: 0,
        isExcessive: false,
        errorMessage: 'No text selected. Please highlight text on a webpage and try again.',
      };
    }

    const words = clean.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const charCount = clean.length;
    const isExcessive = charCount > SelectionService.MAX_RECOMMENDED_CHARS;

    let processedText = clean;
    if (charCount > SelectionService.MAX_ALLOWED_CHARS) {
      processedText = clean.slice(0, SelectionService.MAX_ALLOWED_CHARS);
    }

    return {
      isValid: true,
      cleanText: processedText,
      wordCount,
      charCount,
      isExcessive,
      ...(isExcessive && {
        errorMessage: `Selected text is very long (${wordCount.toLocaleString()} words). Results may take longer or cover the most salient parts.`,
      }),
    };
  }

  /**
   * Counts words in a string.
   */
  public countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
}

export const selectionService = new SelectionService();
export default selectionService;
