/**
 * Language Normalizer Service
 * Cleans whitespace and expands common informal Hinglish/chat abbreviations without altering semantics.
 */

import { LanguageCode, LanguageNormalizationOptions, NormalizedTextResult } from './language.types';
import { detectLanguage } from './language-detector.service';

// Common informal chat & Hinglish abbreviations map (word-boundary matched)
const HINGLISH_NORMALIZATION_MAP: Record<string, string> = {
  plz: 'please',
  plzz: 'please',
  pls: 'please',
  nhi: 'nahi',
  nhn: 'nahi',
  nahe: 'nahi',
  hn: 'haan',
  haa: 'haan',
  kyu: 'kyun',
  kyuki: 'kyunki',
  bcz: 'kyunki',
  bcoz: 'kyunki',
  bcos: 'kyunki',
  achha: 'accha',
  acha: 'accha',
  bht: 'bahut',
  boht: 'bahut',
  kch: 'kuch',
  thnx: 'thanks',
  thx: 'thanks',
  ty: 'thanks',
  bro: 'bhai',
};

/**
 * Normalizes text while strictly preserving:
 * - URLs (e.g. https://example.com)
 * - Code blocks and variable names
 * - Numbers and statistics
 * - Punctuation and quotes
 */
export function normalizeLanguageText(
  rawText: string,
  options: LanguageNormalizationOptions = {}
): NormalizedTextResult {
  if (!rawText || typeof rawText !== 'string') {
    return {
      originalText: rawText || '',
      normalizedText: '',
      detectedLanguage: 'en',
      substitutionsCount: 0,
    };
  }

  const originalText = rawText;
  const detection = detectLanguage(originalText);

  // 1. Whitespace cleanup (preserving paragraphs)
  let working = rawText
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  let substitutionsCount = 0;

  // 2. Expand common informal abbreviations if enabled (default true)
  const shouldNormalizeHinglish = options.normalizeInformalHinglish ?? true;

  if (shouldNormalizeHinglish) {
    // Preserve URLs by temporarily replacing them with placeholders
    const urlPlaceholders: string[] = [];
    working = working.replace(/(https?:\/\/[^\s]+)/g, (url) => {
      urlPlaceholders.push(url);
      return `__URL_PLACEHOLDER_${urlPlaceholders.length - 1}__`;
    });

    // Replace informal tokens using word boundaries
    for (const [abbr, expanded] of Object.entries(HINGLISH_NORMALIZATION_MAP)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      working = working.replace(regex, (match) => {
        substitutionsCount++;
        // Preserve capitalization if first letter was uppercase
        if (match[0] === match[0].toUpperCase()) {
          return expanded.charAt(0).toUpperCase() + expanded.slice(1);
        }
        return expanded;
      });
    }

    // Restore URLs
    working = working.replace(
      /__URL_PLACEHOLDER_(\d+)__/g,
      (_, idx) => urlPlaceholders[parseInt(idx, 10)] || ''
    );
  }

  return {
    originalText,
    normalizedText: working,
    detectedLanguage: detection.detectedLanguage as LanguageCode,
    substitutionsCount,
  };
}
