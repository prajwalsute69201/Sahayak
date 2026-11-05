/**
 * Language Detector Service
 * Accurately detects English, Hindi (Devanagari), and Hinglish (Latin code-switching).
 */

import { LanguageDetectionResult, LanguagePreference } from './language.types';

// Unambiguous strong Hinglish grammatical markers & verbal roots (weight = 2)
const STRONG_HINGLISH_MARKERS = new Set([
  'hai',
  'hain',
  'tha',
  'thi',
  'hoga',
  'hogi',
  'hoge',
  'raha',
  'rahi',
  'rahe',
  'chahiye',
  'gaya',
  'gayi',
  'gaye',
  'karna',
  'karo',
  'karta',
  'karti',
  'karte',
  'kiya',
  'kiye',
  'karega',
  'karegi',
  'karenge',
  'samjho',
  'samajh',
  'batao',
  'dekho',
  'socho',
  'hota',
  'hoti',
  'hote',
  'hona',
  'mujhe',
  'mera',
  'meri',
  'mere',
  'humara',
  'humare',
  'humari',
  'aapka',
  'aapke',
  'aapki',
  'tumhara',
  'tumhe',
  'yeh',
  'woh',
  'iska',
  'iski',
  'iske',
  'uske',
  'unka',
  'unki',
  'kyunki',
  'kyuki',
  'kyun',
  'kyu',
  'kaise',
  'kaisa',
  'kaisi',
  'kahan',
  'kisko',
  'theek',
  'accha',
  'achha',
  'bohot',
  'bahut',
  'zyada',
  'thoda',
  'shuru',
  'khatam',
  'chalega',
  'kuch',
  'kabhi',
  'hamesha',
  'pehle',
]);

// Contextual Hinglish markers (weight = 1)
const CONTEXTUAL_HINGLISH_MARKERS = new Set([
  'aap',
  'tum',
  'hum',
  'mai',
  'ye',
  'wo',
  'aur',
  'lekin',
  'magar',
  'agar',
  'toh',
  'bhi',
  'tak',
  'matlab',
  'jaise',
  'kya',
  'kab',
  'mein',
  'se',
  'ko',
  'ka',
  'ki',
  'ke',
  'pe',
  'wala',
  'wali',
  'wale',
  'sahi',
  'galat',
  'yaar',
  'bhai',
  'haan',
  'nahi',
  'jaldi',
  'baad',
]);

// Indian cultural/culinary nouns that commonly appear in otherwise purely English sentences
const BORROWED_INDIAN_NOUNS = new Set([
  'chai',
  'samosa',
  'biryani',
  'curry',
  'namaste',
  'yoga',
  'guru',
  'delhi',
  'mumbai',
  'india',
  'diwali',
  'holi',
  'rupee',
  'rupees',
]);

// Common English function words
const COMMON_ENGLISH_WORDS = new Set([
  'the',
  'is',
  'are',
  'was',
  'were',
  'and',
  'to',
  'in',
  'that',
  'this',
  'with',
  'for',
  'on',
  'of',
  'it',
  'you',
  'we',
  'can',
  'will',
  'should',
  'would',
  'have',
  'has',
  'had',
  'not',
  'from',
  'by',
  'at',
  'an',
  'as',
  'or',
  'be',
  'if',
  'all',
  'any',
  'which',
  'about',
  'what',
  'how',
  'when',
  'where',
  'who',
  'why',
  'because',
  'there',
  'their',
  'they',
  'more',
  'some',
  'please',
  'thank',
  'thanks',
  'explain',
  'summary',
  'summarize',
  'article',
  'video',
  'code',
  'function',
  'file',
]);

/**
 * Checks if the text has Devanagari script characters (Unicode: \u0900-\u097F).
 */
export function isDevanagariHindi(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const devanagariMatches = text.match(/[\u0900-\u097F]/g);
  if (!devanagariMatches) return false;

  const totalNonWhitespace = text.replace(/\s+/g, '').length;
  if (totalNonWhitespace === 0) return false;

  // If > 20% of characters are Devanagari, it is Hindi text
  return devanagariMatches.length / totalNonWhitespace >= 0.2;
}

/**
 * Tokenizes text into lowercase words.
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  const matches = text.toLowerCase().match(/\b[a-zA-Z0-9'-]+\b/g);
  return matches ? matches.filter((w) => w.length > 0) : [];
}

/**
 * Detects whether an input string is English, Hindi (Devanagari), or Hinglish.
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      detectedLanguage: 'en',
      confidence: 1.0,
      scores: { english: 1.0, hindi: 0.0, hinglish: 0.0 },
      isDevanagari: false,
      tokensCount: 0,
      hinglishMarkersFound: [],
    };
  }

  const cleanText = text.trim();

  // 1. Check Devanagari Hindi
  if (isDevanagariHindi(cleanText)) {
    const devanagariChars = (cleanText.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = cleanText.replace(/\s+/g, '').length;
    const devanagariRatio = totalChars > 0 ? devanagariChars / totalChars : 0;

    return {
      detectedLanguage: 'hi',
      confidence: Math.min(1.0, Math.max(0.7, devanagariRatio)),
      scores: { english: 1 - devanagariRatio, hindi: devanagariRatio, hinglish: 0 },
      isDevanagari: true,
      tokensCount: tokenizeWords(cleanText).length,
      hinglishMarkersFound: [],
    };
  }

  // 2. Tokenize Latin text
  const tokens = tokenizeWords(cleanText);
  if (tokens.length === 0) {
    return {
      detectedLanguage: 'en',
      confidence: 0.8,
      scores: { english: 0.8, hindi: 0.0, hinglish: 0.2 },
      isDevanagari: false,
      tokensCount: 0,
      hinglishMarkersFound: [],
    };
  }

  let englishScore = 0;
  let hinglishScore = 0;
  const hinglishMarkersFound: string[] = [];

  for (const token of tokens) {
    if (BORROWED_INDIAN_NOUNS.has(token)) {
      // Indian cultural nouns in English sentence (e.g. "I love drinking chai") do not indicate Hinglish grammar
      englishScore += 0.5;
      continue;
    }

    if (STRONG_HINGLISH_MARKERS.has(token)) {
      hinglishScore += 2;
      hinglishMarkersFound.push(token);
    } else if (CONTEXTUAL_HINGLISH_MARKERS.has(token)) {
      hinglishScore += 1;
      hinglishMarkersFound.push(token);
    }

    if (COMMON_ENGLISH_WORDS.has(token)) {
      englishScore += 1;
    }
  }

  const totalWeighted = englishScore + hinglishScore;

  // Short greetings / conversational cues
  if (tokens.length <= 3) {
    if (hinglishMarkersFound.length >= 1) {
      return {
        detectedLanguage: 'hi-en',
        confidence: 0.85,
        scores: { english: 0.15, hindi: 0, hinglish: 0.85 },
        isDevanagari: false,
        tokensCount: tokens.length,
        hinglishMarkersFound,
      };
    }
  }

  const hinglishRatio = totalWeighted > 0 ? hinglishScore / totalWeighted : 0;
  const englishRatio = totalWeighted > 0 ? englishScore / totalWeighted : 1.0;

  // Decision rule:
  // Requires at least one Hinglish marker and sufficient weighted proportion
  const hasStrongMarker = hinglishMarkersFound.some((m) => STRONG_HINGLISH_MARKERS.has(m));
  const isHinglish = hasStrongMarker || (hinglishMarkersFound.length >= 2 && hinglishRatio > 0.3);

  if (isHinglish) {
    return {
      detectedLanguage: 'hi-en',
      confidence: Math.min(0.98, Math.max(0.65, hinglishRatio)),
      scores: {
        english: Math.round(englishRatio * 100) / 100,
        hindi: 0.0,
        hinglish: Math.round(hinglishRatio * 100) / 100,
      },
      isDevanagari: false,
      tokensCount: tokens.length,
      hinglishMarkersFound,
    };
  }

  return {
    detectedLanguage: 'en',
    confidence: Math.min(0.98, Math.max(0.65, englishRatio)),
    scores: {
      english: Math.round(englishRatio * 100) / 100,
      hindi: 0.0,
      hinglish: Math.round(hinglishRatio * 100) / 100,
    },
    isDevanagari: false,
    tokensCount: tokens.length,
    hinglishMarkersFound,
  };
}

/**
 * Resolves the effective target language ('en' | 'hi-en') from a preference setting and optional content/query.
 */
export function resolveTargetLanguage(
  preference: LanguagePreference,
  sampleContentOrInput?: string
): 'en' | 'hi-en' {
  if (preference === 'en') return 'en';
  if (preference === 'hi-en') return 'hi-en';

  // If preference is 'auto', inspect provided content or input
  if (sampleContentOrInput && sampleContentOrInput.trim()) {
    const result = detectLanguage(sampleContentOrInput);
    if (result.detectedLanguage === 'hi' || result.detectedLanguage === 'hi-en') {
      return 'hi-en';
    }
    return 'en';
  }

  // Default fallback when content is not provided
  return 'en';
}
