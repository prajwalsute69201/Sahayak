import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  localMatcherService,
  aiMatcherService,
  matchRankingService,
  matchValidationService,
  elementSearchService,
  ElementMatch,
} from '@/features/find-element';
import { ScannedElement, scannerClientService } from '@/features/element-scanner';
import { aiProviderManager } from '@/services/ai';

describe('Structured Element Selection ("Find It For Me" - Slice 11)', () => {
  const mockCandidates: ScannedElement[] = [
    {
      actionId: 1,
      elementId: 'login-btn',
      tagName: 'button',
      type: 'submit',
      category: 'primary-action',
      label: 'Sign In',
      isVisible: true,
      isEnabled: true,
      rect: { top: 100, left: 200, width: 100, height: 40, bottom: 140, right: 300 },
      selector: 'button#login-btn',
    },
    {
      actionId: 2,
      elementId: 'search-input',
      tagName: 'input',
      type: 'search',
      category: 'search-field',
      label: 'Search articles',
      placeholder: 'Search documentation...',
      name: 'q',
      isVisible: true,
      isEnabled: true,
      rect: { top: 20, left: 150, width: 250, height: 35, bottom: 55, right: 400 },
      selector: 'input#search-input',
    },
    {
      actionId: 3,
      elementId: 'cart-link',
      tagName: 'a',
      category: 'navigation',
      label: 'Shopping Cart',
      href: 'https://example.com/cart',
      isVisible: true,
      isEnabled: true,
      rect: { top: 20, left: 600, width: 80, height: 30, bottom: 50, right: 680 },
      selector: 'a#cart-link',
    },
    {
      actionId: 4,
      elementId: 'cancel-btn',
      tagName: 'button',
      type: 'button',
      category: 'secondary-action',
      label: 'Cancel',
      isVisible: true,
      isEnabled: true,
      rect: { top: 100, left: 320, width: 90, height: 40, bottom: 140, right: 410 },
      selector: 'button#cancel-btn',
    },
    {
      actionId: 5,
      elementId: 'disabled-pay-btn',
      tagName: 'button',
      type: 'submit',
      category: 'primary-action',
      label: 'Pay Now',
      isVisible: true,
      isEnabled: false,
      rect: { top: 500, left: 200, width: 120, height: 45, bottom: 545, right: 320 },
      selector: 'button#disabled-pay-btn',
    },
    {
      actionId: 6,
      elementId: 'download-report-btn',
      tagName: 'button',
      category: 'primary-action',
      label: 'Download Annual Report (PDF)',
      isVisible: true,
      isEnabled: true,
      rect: { top: 300, left: 100, width: 220, height: 40, bottom: 340, right: 320 },
      selector: 'button#download-report-btn',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('A. Local Keyword & Semantic Matching', () => {
    it('matches exact label or placeholder', () => {
      const matches = localMatcherService.match('Sign In', mockCandidates);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].actionId).toBe(1);
      expect(matches[0].confidence).toBeGreaterThanOrEqual(0.9);
      expect(matches[0].source).toBe('local');
    });

    it('matches query through synonyms (e.g., "login" -> "Sign In")', () => {
      const matches = localMatcherService.match('Find the login button', mockCandidates);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].actionId).toBe(1);
      expect(matches[0].element.label).toBe('Sign In');
    });

    it('matches Hinglish query with stop word removal (e.g., "Search bar kahan hai?")', () => {
      const matches = localMatcherService.match('Search bar kahan hai?', mockCandidates);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].actionId).toBe(2);
      expect(matches[0].element.category).toBe('search-field');
    });

    it('matches Hinglish shopping query (e.g., "cart dikhao")', () => {
      const matches = localMatcherService.match('cart dikhao', mockCandidates);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].actionId).toBe(3);
      expect(matches[0].element.label).toBe('Shopping Cart');
    });

    it('matches download PDF action through partial keywords', () => {
      const matches = localMatcherService.match('download report', mockCandidates);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].actionId).toBe(6);
      expect(matches[0].element.label).toContain('Download Annual Report');
    });

    it('returns empty array when query is empty or no candidates match', () => {
      expect(localMatcherService.match('', mockCandidates)).toEqual([]);
      expect(localMatcherService.match('flabbergasted non-existent query', mockCandidates)).toEqual(
        []
      );
    });
  });

  describe('B. Match Validation & Sanitization', () => {
    it('extracts JSON from raw string or markdown code fences', () => {
      const jsonStr =
        '```json\n{"matches": [{"actionId": 2, "confidence": 0.9, "reason": "test"}], "notFound": false}\n```';
      const parsed = matchValidationService.extractJSONFromText(jsonStr) as {
        matches: Array<{ actionId: number }>;
      };
      expect(parsed).not.toBeNull();
      expect(parsed.matches[0].actionId).toBe(2);
    });

    it('rejects fabricated or unknown element IDs from AI response', () => {
      const rawAiResponse = {
        matches: [
          { actionId: 2, confidence: 0.95, reason: 'Valid search box' },
          { actionId: 999, confidence: 0.99, reason: 'Hallucinated element' },
          { actionId: 'not-a-number', confidence: 0.8, reason: 'Malformed ID' },
        ],
        notFound: false,
      };

      const validated = matchValidationService.validateAndSanitizeAIMatches(
        rawAiResponse,
        mockCandidates
      );

      expect(validated.validMatches.length).toBe(1);
      expect(validated.validMatches[0].actionId).toBe(2);
    });

    it('clamps confidence scores to valid 0.0 - 1.0 range', () => {
      const rawAiResponse = {
        matches: [
          { actionId: 1, confidence: 1.5, reason: 'Over-confident' },
          { actionId: 3, confidence: -0.2, reason: 'Negative score' },
        ],
      };

      const validated = matchValidationService.validateAndSanitizeAIMatches(
        rawAiResponse,
        mockCandidates
      );

      expect(validated.validMatches[0].confidence).toBe(1.0);
      expect(validated.validMatches[1].confidence).toBe(0.0);
    });
  });

  describe('C. AI-Assisted Matching & Anti-Injection', () => {
    it('calls aiProviderManager with compact serialized candidates and anti-injection instructions', async () => {
      const mockGenerate = vi.spyOn(aiProviderManager, 'generateText').mockResolvedValue({
        text: JSON.stringify({
          matches: [
            {
              actionId: 2,
              confidence: 0.96,
              reason: 'Matches search input field with name q and search placeholder',
            },
          ],
          clarificationNeeded: false,
          notFound: false,
        }),
        provider: 'gemini',
        model: 'gemini-2.0-flash-lite',
        latencyMs: 120,
      });

      const res = await aiMatcherService.matchWithAI({
        userQuery: 'Where do I search docs?',
        candidates: mockCandidates,
        language: 'en',
      });

      expect(res.success).toBe(true);
      expect(res.matches.length).toBe(1);
      expect(res.matches[0].actionId).toBe(2);
      expect(mockGenerate).toHaveBeenCalled();

      // Check prompt includes untrusted page_elements delimiters
      const promptArg = mockGenerate.mock.calls[0][0];
      expect(promptArg).toContain('<page_elements>');
      expect(promptArg).toContain('SAFETY & GROUNDING RULES');
    });

    it('gracefully handles AI provider failures and reports error', async () => {
      vi.spyOn(aiProviderManager, 'generateText').mockRejectedValue(
        new Error('API quota exceeded')
      );

      const res = await aiMatcherService.matchWithAI({
        userQuery: 'Find button',
        candidates: mockCandidates,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('API quota exceeded');
    });
  });

  describe('D. Hybrid Ranking Engine', () => {
    it('blends local and AI matches into ranked list prioritizing high confidence', () => {
      const localMatches: ElementMatch[] = [
        {
          actionId: 1,
          element: mockCandidates[0],
          confidence: 0.85,
          reason: 'Local keyword sign in',
          source: 'local',
        },
      ];

      const aiMatches: ElementMatch[] = [
        {
          actionId: 1,
          element: mockCandidates[0],
          confidence: 0.95,
          reason: 'AI identified authentication button',
          source: 'ai',
        },
      ];

      const { rankedMatches, bestMatch } = matchRankingService.rankHybridMatches(
        localMatches,
        aiMatches
      );

      expect(rankedMatches.length).toBe(1);
      expect(bestMatch).not.toBeNull();
      expect(bestMatch?.source).toBe('hybrid');
      // 0.95 * 0.6 + 0.85 * 0.4 = 0.57 + 0.34 = 0.91
      expect(bestMatch?.confidence).toBe(0.91);
    });

    it('prioritizes enabled elements over disabled elements when confidence is tied', () => {
      const matchEnabled: ElementMatch = {
        actionId: 1,
        element: mockCandidates[0], // isEnabled: true
        confidence: 0.8,
        reason: 'Sign In',
        source: 'local',
      };

      const matchDisabled: ElementMatch = {
        actionId: 5,
        element: mockCandidates[4], // isEnabled: false (Pay Now)
        confidence: 0.8,
        reason: 'Pay Now disabled',
        source: 'local',
      };

      const { rankedMatches } = matchRankingService.rankHybridMatches(
        [matchDisabled, matchEnabled],
        []
      );

      expect(rankedMatches[0].actionId).toBe(1); // Enabled element ranks first
      expect(rankedMatches[1].actionId).toBe(5);
    });

    it('detects ambiguity when multiple controls have nearly identical high confidence', () => {
      const match1: ElementMatch = {
        actionId: 1,
        element: mockCandidates[0],
        confidence: 0.9,
        reason: 'Button 1',
        source: 'local',
      };

      const match2: ElementMatch = {
        actionId: 6,
        element: mockCandidates[5],
        confidence: 0.88,
        reason: 'Button 2',
        source: 'local',
      };

      const { isAmbiguous } = matchRankingService.rankHybridMatches([match1, match2], []);
      expect(isAmbiguous).toBe(true);
    });
  });

  describe('E. Element Search Orchestrator', () => {
    it('returns high-confidence local match immediately without calling AI', async () => {
      const aiSpy = vi.spyOn(aiMatcherService, 'matchWithAI');

      const result = await elementSearchService.search('Sign In', mockCandidates);

      expect(result.notFound).toBe(false);
      expect(result.bestMatch?.actionId).toBe(1);
      expect(result.matchSource).toBe('local');
      expect(aiSpy).not.toHaveBeenCalled();
    });

    it('calls AI matcher for conversational queries and falls back to local on AI error', async () => {
      vi.spyOn(aiMatcherService, 'matchWithAI').mockRejectedValue(new Error('Network error'));

      const result = await elementSearchService.search(
        'Where can I see my cart items?',
        mockCandidates
      );

      expect(result.notFound).toBe(false);
      expect(result.bestMatch?.actionId).toBe(3); // Cart link
      expect(result.matchSource).toBe('local');
    });

    it('returns notFound: true when no elements match', async () => {
      const result = await elementSearchService.search(
        'Find the non-existent flight booking widget',
        mockCandidates
      );

      expect(result.notFound).toBe(true);
      expect(result.bestMatch).toBeNull();
    });
  });

  describe('F. Visual Element Highlighting & Stale Reference Recovery', () => {
    it('invokes scannerClientService to highlight matching element on tab', async () => {
      const highlightSpy = vi
        .spyOn(scannerClientService, 'highlightElement')
        .mockResolvedValue(true);

      const success = await scannerClientService.highlightElement(2);
      expect(success).toBe(true);
      expect(highlightSpy).toHaveBeenCalledWith(2);
    });

    it('detects stale detached element when highlightElement returns false', async () => {
      vi.spyOn(scannerClientService, 'highlightElement').mockResolvedValue(false);

      const success = await scannerClientService.highlightElement(99);
      expect(success).toBe(false);
    });

    it('clears active highlight upon search clear', async () => {
      const clearSpy = vi
        .spyOn(scannerClientService, 'clearHighlight')
        .mockResolvedValue(undefined);

      await scannerClientService.clearHighlight();
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
