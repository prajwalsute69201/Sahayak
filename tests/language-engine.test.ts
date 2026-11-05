import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectLanguage,
  isDevanagariHindi,
  tokenizeWords,
  resolveTargetLanguage,
} from '../src/services/language/language-detector.service';
import { normalizeLanguageText } from '../src/services/language/language-normalizer.service';
import {
  buildLanguageInstruction,
  injectLanguageDirective,
} from '../src/services/language/language-prompt.service';
import { buildYouTubeSummaryPrompt } from '../src/features/youtube-summary/services/youtube-summary.service';
import { storageService } from '../src/services/storage.service';
import { SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS, UserSettings } from '../src/types/settings.types';
import { YouTubeVideoMetadata } from '../src/features/youtube-summary/types/youtube.types';

describe('Slice 5: English & Hinglish Language Engine Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Language Detection Service', () => {
    it('detects pure English sentences accurately', () => {
      expect(isDevanagariHindi('Hello world')).toBe(false);
      expect(tokenizeWords('Hello, world! 123').length).toBe(3);

      const text1 = 'How does garbage collection work in the Google V8 JavaScript engine?';
      const res1 = detectLanguage(text1);
      expect(res1.detectedLanguage).toBe('en');
      expect(res1.isDevanagari).toBe(false);
      expect(res1.scores.english).toBeGreaterThan(0.5);

      const text2 = 'The QuickSort algorithm has an average time complexity of O(n log n).';
      const res2 = detectLanguage(text2);
      expect(res2.detectedLanguage).toBe('en');
      expect(res2.confidence).toBeGreaterThan(0.7);
    });

    it('detects Devanagari Hindi text accurately', () => {
      const hindiText =
        'नमस्ते दोस्तों, आज हम वेब डेवलपमेंट और ब्राउज़र एक्सटेंशन के बारे में बात करेंगे।';
      const res = detectLanguage(hindiText);
      expect(res.detectedLanguage).toBe('hi');
      expect(res.isDevanagari).toBe(true);
      expect(res.scores.hindi).toBeGreaterThan(0.7);
    });

    it('detects conversational Hinglish (code-switching) accurately', () => {
      const hinglish1 = 'Yeh article explain karta hai ki React hooks kaise kaam karte hain.';
      const res1 = detectLanguage(hinglish1);
      expect(res1.detectedLanguage).toBe('hi-en');
      expect(res1.isDevanagari).toBe(false);
      expect(res1.hinglishMarkersFound).toContain('hai');
      expect(res1.hinglishMarkersFound).toContain('kaise');

      const hinglish2 = 'Mujhe is video ka summary chahiye, please key points batao.';
      const res2 = detectLanguage(hinglish2);
      expect(res2.detectedLanguage).toBe('hi-en');
      expect(res2.scores.hinglish).toBeGreaterThan(0.4);

      const hinglish3 = 'Bohot achha explanation tha lekin architecture thoda complex hai.';
      const res3 = detectLanguage(hinglish3);
      expect(res3.detectedLanguage).toBe('hi-en');
    });

    it('avoids false positives on English sentences with Indian nouns or cultural terms', () => {
      const mixedEnglish =
        'I had a cup of hot masala chai and two samosas in Delhi before starting my work.';
      const res = detectLanguage(mixedEnglish);
      expect(res.detectedLanguage).toBe('en');
      expect(res.scores.english).toBeGreaterThan(0.6);
    });

    it('handles code snippets and technical text without misclassification', () => {
      const codeSnippet =
        'const data = await fetch("https://api.github.com/users"); if (!data.ok) return null;';
      const res = detectLanguage(codeSnippet);
      expect(res.detectedLanguage).toBe('en');
    });

    it('handles short and ambiguous inputs gracefully', () => {
      // English short words
      expect(detectLanguage('ok').detectedLanguage).toBe('en');
      expect(detectLanguage('hello there').detectedLanguage).toBe('en');
      expect(detectLanguage('thank you').detectedLanguage).toBe('en');

      // Hinglish short words
      expect(detectLanguage('theek hai').detectedLanguage).toBe('hi-en');
      expect(detectLanguage('haan bhai').detectedLanguage).toBe('hi-en');
      expect(detectLanguage('kya haal hai').detectedLanguage).toBe('hi-en');

      // Empty text
      expect(detectLanguage('').detectedLanguage).toBe('en');
    });

    it('resolves target language based on preference and dynamic content', () => {
      expect(resolveTargetLanguage('en')).toBe('en');
      expect(resolveTargetLanguage('hi-en')).toBe('hi-en');

      // Auto mode resolution
      expect(
        resolveTargetLanguage(
          'auto',
          'Yeh video explain karta hai ki neural network kaise kaam karta hai'
        )
      ).toBe('hi-en');
      expect(
        resolveTargetLanguage('auto', 'The presentation demonstrates distributed system resilience')
      ).toBe('en');
      expect(resolveTargetLanguage('auto', '')).toBe('en');
    });
  });

  describe('2. Language Normalizer Service', () => {
    it('normalizes excessive whitespace while preserving line breaks', () => {
      const dirty = 'This   is    a   test\n\n\n\nwith multiple   blank lines.';
      const res = normalizeLanguageText(dirty);
      expect(res.normalizedText).toBe('This is a test\n\nwith multiple blank lines.');
    });

    it('expands common informal Hinglish and chat abbreviations', () => {
      const text = 'Plz summary share karo bcz mujhe time nhi mila.';
      const res = normalizeLanguageText(text);
      expect(res.normalizedText).toBe('Please summary share karo kyunki mujhe time nahi mila.');
      expect(res.substitutionsCount).toBe(3);
    });

    it('preserves URLs, numbers, quotes, and punctuation without tampering', () => {
      const text =
        'Check out https://github.com/sahayak/agent for details! Model 2.0 scored 99.4% in "Reasoning". Plz test it.';
      const res = normalizeLanguageText(text);
      expect(res.normalizedText).toContain('https://github.com/sahayak/agent');
      expect(res.normalizedText).toContain('99.4%');
      expect(res.normalizedText).toContain('"Reasoning"');
      expect(res.normalizedText).toContain('Please test it.');
    });

    it('keeps original input intact in result object', () => {
      const input = 'plz tell me';
      const res = normalizeLanguageText(input);
      expect(res.originalText).toBe('plz tell me');
      expect(res.normalizedText).toBe('please tell me');
    });
  });

  describe('3. Language-Aware Prompt Construction', () => {
    it('generates standard English instructions', () => {
      const instruction = buildLanguageInstruction('en');
      expect(instruction).toContain('LANGUAGE DIRECTIVE:');
      expect(instruction).toContain('clear, natural, and grammatically correct English');
      expect(instruction).toContain('SECURITY BOUNDARY:');
    });

    it('generates conversational Hinglish instructions with Latin script requirement', () => {
      const instruction = buildLanguageInstruction('hi-en');
      expect(instruction).toContain('LANGUAGE DIRECTIVE:');
      expect(instruction).toContain('conversational Hinglish');
      expect(instruction).toContain('Strictly write in the Latin / Roman alphabet');
      expect(instruction).toContain('NO circumstance should you use Devanagari script');
      expect(instruction).toContain('TECHNICAL VOCABULARY:');
      expect(instruction).toContain('MUST remain in English');
      expect(instruction).toContain('SECURITY BOUNDARY:');
    });

    it('injects language directives seamlessly into existing base system prompts', () => {
      const basePrompt = 'You are Sahayak, an autonomous browser companion.';
      const combined = injectLanguageDirective(basePrompt, 'hi-en');
      expect(combined).toContain('You are Sahayak, an autonomous browser companion.');
      expect(combined).toContain('LANGUAGE DIRECTIVE:');
      expect(combined).toContain('conversational Hinglish');
    });
  });

  describe('4. Article & YouTube Summarizer Integration', () => {
    const mockMetadata: YouTubeVideoMetadata = {
      videoId: 'dQw4w9WgXcQ',
      title: 'Modern Web Architecture',
      channelName: 'Google Chrome Developers',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    };

    it('injects Hinglish language instruction into YouTube summary prompts', () => {
      const { systemInstruction } = buildYouTubeSummaryPrompt(
        mockMetadata,
        '[00:00] Intro to Service Workers',
        'hi-en'
      );
      expect(systemInstruction).toContain('conversational Hinglish');
      expect(systemInstruction).toContain('Strictly write in the Latin / Roman alphabet');
      expect(systemInstruction).toContain('UNTRUSTED INPUT ISOLATION');
    });

    it('injects English language instruction into YouTube summary prompts', () => {
      const { systemInstruction } = buildYouTubeSummaryPrompt(
        mockMetadata,
        '[00:00] Intro to Service Workers',
        'en'
      );
      expect(systemInstruction).toContain('grammatically correct English');
    });

    it('resolves auto mode dynamically for Hindi/Hinglish transcripts', () => {
      const hinglishTranscript = '[00:00] Aaj hum baat karenge web performance ke baare mein.';
      const { systemInstruction } = buildYouTubeSummaryPrompt(
        mockMetadata,
        hinglishTranscript,
        'auto'
      );
      expect(systemInstruction).toContain('conversational Hinglish');
    });
  });

  describe('5. Settings & Persistence of Language Preference', () => {
    it('supports auto, en, and hi-en in UserSettings', async () => {
      const customSettings: UserSettings = {
        ...DEFAULT_SETTINGS,
        language: 'hi-en',
      };

      const setSpy = vi.spyOn(storageService, 'set').mockResolvedValue();
      const getSpy = vi.spyOn(storageService, 'get').mockResolvedValue(customSettings);

      await storageService.set(SETTINGS_STORAGE_KEY, customSettings);
      expect(setSpy).toHaveBeenCalledWith(SETTINGS_STORAGE_KEY, customSettings);

      const retrieved = await storageService.get<UserSettings>(SETTINGS_STORAGE_KEY);
      expect(getSpy).toHaveBeenCalledWith(SETTINGS_STORAGE_KEY);
      expect(retrieved?.language).toBe('hi-en');
    });

    it('supports auto language preference in UserSettings', async () => {
      const autoSettings: UserSettings = {
        ...DEFAULT_SETTINGS,
        language: 'auto',
      };

      vi.spyOn(storageService, 'get').mockResolvedValue(autoSettings);
      const retrieved = await storageService.get<UserSettings>(SETTINGS_STORAGE_KEY);
      expect(retrieved?.language).toBe('auto');
    });
  });
});
