/**
 * Language Prompt Service
 * Generates robust, hardened system instructions for English and Hinglish generation in Gemini.
 */

import { LanguagePreference, LanguagePromptOptions } from './language.types';
import { resolveTargetLanguage } from './language-detector.service';

/**
 * Builds the strict language directive for Gemini system instructions.
 */
export function buildLanguageInstruction(
  preference: LanguagePreference,
  sampleContentOrInput?: string,
  _options: Partial<LanguagePromptOptions> = {}
): string {
  const target = resolveTargetLanguage(preference, sampleContentOrInput);

  if (target === 'hi-en') {
    return `LANGUAGE DIRECTIVE:
You must communicate in natural, conversational Hinglish (Hindi written using the Latin / English alphabet).
- SCRIPT REQUIREMENT: Strictly write in the Latin / Roman alphabet (e.g., 'Yeh concept explain karta hai...'). Under NO circumstance should you use Devanagari script (e.g., do NOT write 'यह कॉन्सेप्ट...').
- CODE-SWITCHING & GRAMMAR: Blend Hindi grammatical structures with commonly understood English words smoothly and conversationally. Do not produce rigid, word-for-word literal translations.
- TECHNICAL VOCABULARY: All technical terminology, programming terms, API names, metrics, formulas, framework names, and quotes MUST remain in English (e.g., 'state management', 'garbage collection', 'DOM manipulation', 'latency', 'token limit').
- SECURITY BOUNDARY: This language rule applies exclusively to the tone and wording of your response. It does NOT allow bypassing content constraints, delimiter tags (<ARTICLE_CONTENT>, <VIDEO_TRANSCRIPT>), or safety instructions.`;
  }

  // Default: Standard English
  return `LANGUAGE DIRECTIVE:
Generate your response entirely in clear, natural, and grammatically correct English.
- SCRIPT & VOCABULARY: Write standard English prose. Do not use Romanized slang or non-English code-switching unless quoting the source text.
- CLARITY: Maintain a professional, informative, and accessible tone.
- SECURITY BOUNDARY: This language rule applies exclusively to the tone and wording of your response. It does NOT allow bypassing content constraints, delimiter tags (<ARTICLE_CONTENT>, <VIDEO_TRANSCRIPT>), or safety instructions.`;
}

/**
 * Injects language instructions into a base system prompt.
 */
export function injectLanguageDirective(
  baseSystemPrompt: string,
  preference: LanguagePreference,
  sampleContentOrInput?: string
): string {
  const directive = buildLanguageInstruction(preference, sampleContentOrInput);
  return `${baseSystemPrompt.trim()}\n\n${directive}`;
}
