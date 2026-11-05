/**
 * Language Engine Type Definitions
 * Supports English, Hindi (Devanagari), and Hinglish (Romanized Hindi-English code-switching).
 */

export type LanguageCode = 'en' | 'hi' | 'hi-en';

export type LanguagePreference = 'auto' | 'en' | 'hi-en';

export interface LanguageDetectionScores {
  english: number;
  hindi: number;
  hinglish: number;
}

export interface LanguageDetectionResult {
  detectedLanguage: LanguageCode;
  confidence: number; // 0.0 to 1.0
  scores: LanguageDetectionScores;
  isDevanagari: boolean;
  tokensCount: number;
  hinglishMarkersFound: string[];
}

export interface LanguageNormalizationOptions {
  normalizeInformalHinglish?: boolean;
  trimExtraWhitespace?: boolean;
}

export interface NormalizedTextResult {
  originalText: string;
  normalizedText: string;
  detectedLanguage: LanguageCode;
  substitutionsCount: number;
}

export interface LanguagePromptOptions {
  targetLanguage: LanguagePreference;
  detectedLanguage?: LanguageCode;
  preserveEnglishTechnicalTerms?: boolean;
  tone?: 'concise' | 'detailed' | 'conversational';
}
