import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  pageContextService,
  contextChunkerService,
  contextRetrievalService,
  groundingService,
  chatService,
  PageContext,
  PageSection,
} from '@/features/page-chat';
import { geminiClient } from '@/services/gemini/gemini.client';
import { storageService } from '@/services/storage.service';
import { SETTINGS_STORAGE_KEY } from '@/types/settings.types';
import * as youtubeDetector from '@/features/youtube-summary/services/youtube-detector.service';
import * as youtubeTranscript from '@/features/youtube-summary/services/transcript.service';
import { articleExtractorService } from '@/features/article-summary/services/article-extractor.service';

describe('Grounded Page Chat System (Slice 6)', () => {
  const mockApiKey = 'AIzaSyPageChatTestKey1234567890';

  beforeEach(async () => {
    await storageService.clear();
    await storageService.set(SETTINGS_STORAGE_KEY, {
      geminiApiKey: mockApiKey,
      language: 'en',
    });
    vi.clearAllMocks();
  });

  // Sample Mock Page Context for Testing
  const sampleArticleContext: PageContext = {
    id: 'tab-101:https://tech-insider.example/ai-revolution',
    tabId: 101,
    url: 'https://tech-insider.example/ai-revolution',
    title: 'The Modern AI Revolution and Its Economic Impacts',
    domain: 'tech-insider.example',
    contentType: 'article',
    mainContent: 'Full article text regarding modern artificial intelligence...',
    sections: [
      {
        id: 'sec-0',
        heading: 'Introduction to Modern AI',
        level: 2,
        content:
          'Artificial intelligence has transformed digital automation. Recent advancements in transformers and deep learning architectures have empowered developers to build autonomous web agents capable of multi-step decision making.',
        wordCount: 30,
        charCount: 220,
      },
      {
        id: 'sec-1',
        heading: 'Key Economic Statistics 2024',
        level: 2,
        content:
          'According to recent economic studies, the enterprise AI market reached $150 billion in 2024, representing a 38% annual growth rate. Over 62% of Fortune 500 corporations report deploying customer-facing AI agents.',
        wordCount: 35,
        charCount: 230,
      },
      {
        id: 'sec-2',
        heading: 'Ethical Challenges & Privacy Rails',
        level: 2,
        content:
          'Security researchers emphasize that local-first browser agents must maintain strict zero-telemetry policies and human approval gates to avoid unauthorized data leakage or unsafe transactions.',
        wordCount: 28,
        charCount: 210,
      },
      {
        id: 'sec-3',
        heading: 'Conclusion and Future Outlook',
        level: 2,
        content:
          'The future of browser computing lies in lightweight, context-aware assistants that respect user autonomy and privacy.',
        wordCount: 18,
        charCount: 120,
      },
    ],
    links: [
      { text: 'AI Market Report 2024', url: 'https://tech-insider.example/report-2024' },
      { text: 'Privacy Best Practices', url: 'https://tech-insider.example/privacy' },
    ],
    wordCount: 111,
    extractedAt: Date.now(),
    isTruncated: false,
    language: 'en',
  };

  /* -------------------------------------------------------------------------
   * A. Page Content Extraction & Representation
   * ------------------------------------------------------------------------- */
  describe('Page Content Extraction & Inaccessible URL Detection', () => {
    it('detects restricted browser URLs and flags isRestricted with explanatory reason', async () => {
      const chromeTabsSpy = vi.spyOn(chrome.tabs, 'query').mockResolvedValueOnce([
        {
          id: 202,
          url: 'chrome://extensions',
          title: 'Extensions Settings',
        } as chrome.tabs.Tab,
      ]);

      const context = await pageContextService.extractContextFromActiveTab();

      expect(context.isRestricted).toBe(true);
      expect(context.restrictionReason).toContain('cannot access internal browser pages');
      expect(context.sections).toHaveLength(0);
      chromeTabsSpy.mockRestore();
    });

    it('detects about:blank and edge:// protocols as restricted', () => {
      expect(pageContextService.isRestrictedUrl('about:blank')).toBe(true);
      expect(pageContextService.isRestrictedUrl('edge://settings')).toBe(true);
      expect(pageContextService.isRestrictedUrl('chrome-extension://abcdef/sidepanel.html')).toBe(
        true
      );
      expect(pageContextService.isRestrictedUrl('https://example.com/blog/article')).toBe(false);
    });

    it('extracts and structures YouTube video context with timestamped interval sections', async () => {
      const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      const isYtSpy = vi.spyOn(youtubeDetector, 'isYouTubeVideoUrl').mockReturnValue(true);
      const parseYtSpy = vi.spyOn(youtubeDetector, 'parseYouTubeUrl').mockReturnValue({
        isValid: true,
        videoId: 'dQw4w9WgXcQ',
      });

      const retrieveSpy = vi
        .spyOn(youtubeTranscript, 'retrieveYouTubeTranscript')
        .mockResolvedValue({
          success: true,
          rawText: 'Hello world this is the video transcript segment...',
          segments: [
            {
              startSeconds: 0,
              durationSeconds: 30,
              text: 'Welcome to our comprehensive tutorial on AI.',
              timestamp: '00:00',
            },
            {
              startSeconds: 190,
              durationSeconds: 45,
              text: 'Now moving on to part 2 of our tutorial.',
              timestamp: '03:10',
            },
          ],
          language: 'en',
          isAutoGenerated: false,
        });

      const chromeTabsSpy = vi.spyOn(chrome.tabs, 'query').mockResolvedValueOnce([
        {
          id: 303,
          url: ytUrl,
          title: 'Complete AI Tutorial - YouTube',
        } as chrome.tabs.Tab,
      ]);

      const context = await pageContextService.extractContextFromActiveTab();

      expect(context.contentType).toBe('youtube');
      expect(context.title).toBe('Complete AI Tutorial');
      expect(context.sections.length).toBeGreaterThanOrEqual(1);
      expect(context.sections[0].heading).toContain('[00:00 - 03:10]');

      isYtSpy.mockRestore();
      parseYtSpy.mockRestore();
      retrieveSpy.mockRestore();
      chromeTabsSpy.mockRestore();
    });

    it('refreshes context and clears cached tab representation when refreshContext is invoked', async () => {
      const chromeTabsSpy = vi.spyOn(chrome.tabs, 'query').mockResolvedValue([
        {
          id: 404,
          url: 'https://example.com/refreshed-page',
          title: 'Refreshed Page Title',
        } as chrome.tabs.Tab,
      ]);

      const extractSpy = vi
        .spyOn(articleExtractorService, 'extractFromActiveTab')
        .mockResolvedValueOnce({
          title: 'Refreshed Page Title',
          textContent: 'Refreshed article content for verification test.',
          length: 50,
          wordCount: 10,
          url: 'https://example.com/refreshed-page',
        });

      const refreshed = await pageContextService.refreshContext();
      expect(refreshed.url).toBe('https://example.com/refreshed-page');
      expect(refreshed.title).toBe('Refreshed Page Title');

      extractSpy.mockRestore();
      chromeTabsSpy.mockRestore();
    });
  });

  /* -------------------------------------------------------------------------
   * B. Context Chunking Service
   * ------------------------------------------------------------------------- */
  describe('Context Chunker Service', () => {
    it('preserves existing heading structures when sections fit within size thresholds', () => {
      const sections = contextChunkerService.chunkPageContext({
        title: sampleArticleContext.title,
        mainContent: sampleArticleContext.mainContent,
        sections: sampleArticleContext.sections,
      });

      expect(sections).toHaveLength(4);
      expect(sections[0].heading).toBe('Introduction to Modern AI');
      expect(sections[1].heading).toBe('Key Economic Statistics 2024');
    });

    it('splits oversized sections into numbered parts while preserving the parent heading', () => {
      const hugeParagraph = 'Oversized sentence discussion. '.repeat(150); // ~4600 chars
      const oversizedSection: PageSection = {
        id: 'sec-oversized',
        heading: 'Deep Dive Architecture',
        level: 2,
        content: `${hugeParagraph}\n\n${hugeParagraph}`,
        wordCount: 600,
        charCount: 9200,
      };

      const result = contextChunkerService.chunkPageContext(
        {
          title: 'System Design',
          mainContent: '',
          sections: [oversizedSection],
        },
        3000 // max 3000 chars per chunk
      );

      expect(result.length).toBeGreaterThan(1);
      expect(result[0].heading).toBe('Deep Dive Architecture (Part 1)');
      expect(result[1].heading).toBe('Deep Dive Architecture (Part 2)');
    });

    it('generates semantic sections from raw unstructured text using markdown or paragraph breaks', () => {
      const rawText = `## Section Alpha\nContent under alpha.\n\n## Section Beta\nContent under beta.`;
      const sections = contextChunkerService.createSectionsFromRawText(rawText, 'Doc Title');

      expect(sections).toHaveLength(2);
      expect(sections[0].heading).toBe('Section Alpha');
      expect(sections[1].heading).toBe('Section Beta');
    });
  });

  /* -------------------------------------------------------------------------
   * C. Context Retrieval Service
   * ------------------------------------------------------------------------- */
  describe('Context Retrieval & Query Scoring', () => {
    it('retrieves and boosts sections containing exact question keywords and statistics', () => {
      const result = contextRetrievalService.retrieveRelevantSections(
        sampleArticleContext,
        'What are the key statistics and growth numbers mentioned for 2024?'
      );

      expect(result.sections.length).toBeGreaterThan(0);
      const topSection = result.sections.find((s) =>
        s.heading.includes('Economic Statistics 2024')
      );
      expect(topSection).toBeDefined();
      expect(topSection?.relevanceScore).toBeGreaterThan(0);
    });

    it('prioritizes explicit section references like "second section" or "section 2"', () => {
      const result = contextRetrievalService.retrieveRelevantSections(
        sampleArticleContext,
        'Explain the second section in simple words.'
      );

      // Section 1 is the 2nd section (0-indexed: Introduction is 0, Statistics is 1)
      const sec2 = result.sections.find((s) => s.id === 'sec-1');
      expect(sec2).toBeDefined();
      expect(sec2?.matchReasons).toContain('explicit_section_target');
    });

    it('provides high-level overview sections on broad questions like "What is this article about?"', () => {
      const result = contextRetrievalService.retrieveRelevantSections(
        sampleArticleContext,
        'What is this article about?'
      );

      expect(result.sections.length).toBeGreaterThan(0);
      // Intro section should be prioritized
      expect(result.sections[0].heading).toBe('Introduction to Modern AI');
    });

    it('enforces max word budget and marks isPartialContext when document is large', () => {
      // Build a 10-section document exceeding budget
      const largeSections: PageSection[] = Array.from({ length: 10 }, (_, i) => ({
        id: `sec-${i}`,
        heading: `Chapter ${i + 1}`,
        level: 2,
        content: `Content for chapter ${i + 1} with abundant details. `.repeat(100), // ~600 words
        wordCount: 600,
        charCount: 3500,
      }));

      const largeContext: PageContext = {
        ...sampleArticleContext,
        sections: largeSections,
        wordCount: 6000,
      };

      const result = contextRetrievalService.retrieveRelevantSections(
        largeContext,
        'Chapter 1 discussion details',
        1500 // budget 1500 words
      );

      expect(result.isPartialContext).toBe(true);
      expect(result.unretrievedSectionCount).toBeGreaterThan(0);
      expect(result.totalRetrievedWords).toBeLessThanOrEqual(1800);
    });
  });

  /* -------------------------------------------------------------------------
   * D. Grounding Prompts & System Instructions
   * ------------------------------------------------------------------------- */
  describe('Grounding Prompt Hardening & Anti-Injection Rules', () => {
    it('generates system instruction demanding explicit refusal if info is absent', () => {
      const sysInstruction = groundingService.buildSystemInstruction({
        language: 'en',
      });

      expect(sysInstruction).toContain('PRIMARY SOURCE OF TRUTH');
      expect(sysInstruction).toContain('This information is not present on the current page.');
      expect(sysInstruction).toContain('CITATIONS & SECTION HEADINGS');
      expect(sysInstruction).toContain('SECURITY & PROMPT INJECTION RESISTANCE');
    });

    it('generates Hinglish refusal directive when language preference is hi-en', () => {
      const sysInstruction = groundingService.buildSystemInstruction({
        language: 'hi-en',
      });

      expect(sysInstruction).toContain('Yeh jaankari current page par uplabdh nahi hai.');
      expect(sysInstruction).toContain('natural, conversational Hinglish');
    });

    it('wraps user prompt inside untrusted <PAGE_CONTEXT> delimiters separate from user message', () => {
      const retrieved = contextRetrievalService.retrieveRelevantSections(
        sampleArticleContext,
        'What is modern AI?'
      );

      const prompt = groundingService.formatGroundedUserPrompt('What is modern AI?', retrieved);

      expect(prompt).toContain('<PAGE_CONTEXT>');
      expect(prompt).toContain('</PAGE_CONTEXT>');
      expect(prompt).toContain('Title: The Modern AI Revolution and Its Economic Impacts');
      expect(prompt).toContain('USER QUESTION:');
      expect(prompt).toContain('What is modern AI?');
    });
  });

  /* -------------------------------------------------------------------------
   * E. Chat Service: Multi-Turn Conversation & Tab Isolation
   * ------------------------------------------------------------------------- */
  describe('Chat Service & Tab Isolation', () => {
    it('maintains isolated conversations for distinct browser tabs/URLs', () => {
      const tab1Key = chatService.getSessionKey(101, 'https://site-a.com');
      const tab2Key = chatService.getSessionKey(202, 'https://site-b.com');

      expect(tab1Key).not.toBe(tab2Key);

      chatService.appendMessage(101, 'https://site-a.com', {
        id: 'msg-1',
        role: 'user',
        content: 'Tab 1 Question',
        timestamp: Date.now(),
        status: 'complete',
      });

      chatService.appendMessage(202, 'https://site-b.com', {
        id: 'msg-2',
        role: 'user',
        content: 'Tab 2 Question',
        timestamp: Date.now(),
        status: 'complete',
      });

      const tab1Msgs = chatService.getSessionMessages(101, 'https://site-a.com');
      const tab2Msgs = chatService.getSessionMessages(202, 'https://site-b.com');

      expect(tab1Msgs).toHaveLength(1);
      expect(tab1Msgs[0].content).toBe('Tab 1 Question');

      expect(tab2Msgs).toHaveLength(1);
      expect(tab2Msgs[0].content).toBe('Tab 2 Question');
    });

    it('clears session conversation without affecting other tabs', () => {
      chatService.clearSession(101, 'https://site-a.com');

      expect(chatService.getSessionMessages(101, 'https://site-a.com')).toHaveLength(0);
      expect(chatService.getSessionMessages(202, 'https://site-b.com')).toHaveLength(1);
    });

    it('extracts section references cited in brackets from assistant response', () => {
      const mockResponse =
        'According to [Section: Key Economic Statistics 2024], the market grew by 38%.';
      const retrieved = contextRetrievalService.retrieveRelevantSections(
        sampleArticleContext,
        'growth'
      );

      const citations = chatService.extractReferencedSections(mockResponse, retrieved);
      expect(citations).toContain('Key Economic Statistics 2024');
    });

    it('sends question with streaming generation, returns grounded assistant message', async () => {
      const mockStreamResult = {
        text: 'The AI market reached $150 billion in 2024 [Section: Key Economic Statistics 2024].',
        model: 'gemini-2.0-flash-lite',
        finishReason: 'STOP',
        latencyMs: 150,
        isStreamed: true,
      };

      const streamSpy = vi
        .spyOn(geminiClient, 'generateStream')
        .mockResolvedValueOnce(mockStreamResult);

      const { message, retrievedContext } = await chatService.sendQuestion({
        question: 'What is the market size in 2024?',
        pageContext: sampleArticleContext,
        language: 'en',
      });

      expect(streamSpy).toHaveBeenCalledTimes(1);
      expect(message.role).toBe('model');
      expect(message.status).toBe('complete');
      expect(message.content).toContain('$150 billion');
      expect(message.sourceSections).toContain('Key Economic Statistics 2024');
      expect(retrievedContext.sections.length).toBeGreaterThan(0);

      streamSpy.mockRestore();
    });

    it('marks message as interrupted when user stops generation', async () => {
      const mockInterruptedResult = {
        text: 'Partial text generated before stop...',
        model: 'gemini-2.0-flash-lite',
        finishReason: 'USER_CANCELLED',
        latencyMs: 80,
        isStreamed: true,
      };

      const streamSpy = vi
        .spyOn(geminiClient, 'generateStream')
        .mockResolvedValueOnce(mockInterruptedResult);

      const { message } = await chatService.sendQuestion({
        question: 'Tell me everything about AI',
        pageContext: sampleArticleContext,
        language: 'en',
      });

      expect(message.status).toBe('interrupted');
      expect(message.content).toBe('Partial text generated before stop...');

      streamSpy.mockRestore();
    });
  });
});
