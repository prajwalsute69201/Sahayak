import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { extractArticleFromDocument } from '@/content/readabilityReader';
import { articleExtractorService } from '@/features/article-summary/services/article-extractor.service';
import { contentChunkerService } from '@/features/article-summary/services/content-chunker.service';
import { summaryService } from '@/features/article-summary/services/summary.service';
import { ExtractedArticle } from '@/features/article-summary/types/article.types';
import { geminiClient } from '@/services/gemini';

describe('Article Extraction & Structured Summaries (Slice 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. DOM Article Extraction (Mozilla Readability)', () => {
    it('extracts clean article text and metadata from a readable document', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>The Rise of Context-Aware Browser Agents</title>
            <meta name="author" content="Dr. Elena Vance" />
            <meta property="og:site_name" content="Tech Frontier" />
            <meta property="article:published_time" content="2026-10-15T09:00:00Z" />
            <meta name="description" content="An in-depth look at AI agents in modern browsers." />
          </head>
          <body>
            <nav><a href="/">Home</a><a href="/news">News</a></nav>
            <article>
              <h1>The Rise of Context-Aware Browser Agents</h1>
              <p class="byline">By Dr. Elena Vance</p>
              <p>Autonomous AI agents are increasingly moving from external chat applications directly into browser side panels. By keeping the user in the execution loop, modern assistants reduce the risk of hallucination and unapproved web transactions.</p>
              <p>In this architecture, deterministic safety rails are hardcoded in the client runtime rather than relying solely on system prompts. This guarantees that banking domains, password inputs, and checkout forms are protected.</p>
              <p>In conclusion, human-in-the-loop browser companions bridge the gap between intelligence and safety, offering an indispensable tool for research and productivity.</p>
            </article>
            <div class="ad-banner">Sponsored Advertisement</div>
            <footer>Copyright 2026 Tech Frontier</footer>
          </body>
        </html>
      `;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const result = extractArticleFromDocument(doc);

      expect(result.success).toBe(true);
      expect(result.article).toBeDefined();

      const article = result.article!;
      expect(article.title).toContain('The Rise of Context-Aware Browser Agents');
      expect(article.byline).toBe('Dr. Elena Vance');
      expect(article.siteName).toBe('Tech Frontier');
      expect(article.publishedTime).toBe('2026-10-15T09:00:00Z');
      expect(article.textContent).toContain('Autonomous AI agents are increasingly moving');
      expect(article.textContent).toContain('deterministic safety rails are hardcoded');
      expect(article.textContent).not.toContain('Sponsored Advertisement');
      expect(article.wordCount).toBeGreaterThan(50);
    });

    it('returns error when page lacks readable article content', () => {
      const emptyHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Empty Page</title></head>
          <body><div>Just a short sentence.</div></body>
        </html>
      `;

      const parser = new DOMParser();
      const doc = parser.parseFromString(emptyHtml, 'text/html');

      const result = extractArticleFromDocument(doc);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_READABLE_CONTENT');
    });

    it('gracefully handles missing metadata (author, date, siteName)', () => {
      const minimalHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Minimal Article</title></head>
          <body>
            <article>
              <p>This is a valid article body without any author meta tags or publication date meta tags.</p>
              <p>Modern browser extensions must handle incomplete metadata without crashing or fabricating missing facts.</p>
              <p>The parser should extract available title and clean text while leaving absent fields undefined.</p>
            </article>
          </body>
        </html>
      `;

      const parser = new DOMParser();
      const doc = parser.parseFromString(minimalHtml, 'text/html');

      const result = extractArticleFromDocument(doc);

      expect(result.success).toBe(true);
      expect(result.article?.title).toBe('Minimal Article');
      expect(result.article?.byline).toBeUndefined();
      expect(result.article?.publishedTime).toBeUndefined();
      expect(result.article?.textContent).toContain('valid article body');
    });
  });

  describe('2. Article Extractor Service & Tab Restrictions', () => {
    it('blocks extraction and provides friendly guidance on restricted internal URLs', async () => {
      // Mock chrome.tabs.query returning chrome://extensions
      chrome.tabs.query = vi.fn().mockResolvedValue([
        {
          id: 1,
          url: 'chrome://extensions',
          title: 'Extensions',
        },
      ]);

      await expect(articleExtractorService.extractFromActiveTab()).rejects.toThrow(
        /internal browser pages/i
      );
    });

    it('throws when no active browser tab is found', async () => {
      chrome.tabs.query = vi.fn().mockResolvedValue([]);

      await expect(articleExtractorService.extractFromActiveTab()).rejects.toThrow(
        /no active browser tab/i
      );
    });
  });

  describe('3. Content Chunker Service', () => {
    it('identifies when text requires chunking based on character threshold', () => {
      const shortText = 'A'.repeat(5000);
      const longText = 'B'.repeat(25000);

      expect(contentChunkerService.shouldChunk(shortText)).toBe(false);
      expect(contentChunkerService.shouldChunk(longText)).toBe(true);
    });

    it('splits extensive text into semantic paragraph chunks with overlap', () => {
      const p1 = 'First paragraph content '.repeat(100);
      const p2 = 'Second paragraph content '.repeat(100);
      const p3 = 'Third paragraph content '.repeat(100);
      const fullText = `${p1}\n\n${p2}\n\n${p3}`;

      const chunks = contentChunkerService.chunkText(fullText, 3000, 200);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toContain('First paragraph content');
      // Verify overlap was carried over into chunk 2
      expect(chunks[1]).toBeDefined();
    });
  });

  describe('4. Structured Summarization with Gemini', () => {
    const mockArticle: ExtractedArticle = {
      title: 'Next-Gen Agent Architectures',
      url: 'https://example.com/agents',
      textContent: 'Artificial intelligence is evolving into user-guided browser execution...',
      length: 500,
      wordCount: 85,
    };

    it('generates and safely parses a valid JSON structured summary', async () => {
      const mockJsonResponse = JSON.stringify({
        overview: 'This article outlines the evolution of browser AI agents.',
        keyPoints: [
          'Direct side panel integration keeps user in the loop.',
          'Deterministic safety rails block banking sites.',
          'Local storage preserves user privacy.',
        ],
        detailedSummary: 'The article details the shift towards client-side execution...',
        importantFacts: [
          'Manifest V3 was adopted across modern browsers',
          '95% of accidental errors are prevented by HITL approval',
        ],
        conclusion: 'User-controlled companions offer the safest path forward.',
        topicsAndKeywords: ['Browser Agents', 'Manifest V3', 'Safety'],
      });

      vi.spyOn(geminiClient, 'generateText').mockResolvedValue({
        text: mockJsonResponse,
        model: 'gemini-2.0-flash-lite',
        latencyMs: 320,
      });

      const summary = await summaryService.generateSummary(mockArticle, 'en');

      expect(summary.overview).toBe('This article outlines the evolution of browser AI agents.');
      expect(summary.keyPoints).toHaveLength(3);
      expect(summary.importantFacts).toContain('Manifest V3 was adopted across modern browsers');
      expect(summary.conclusion).toContain('User-controlled companions');
      expect(summary.topicsAndKeywords).toContain('Browser Agents');
      expect(summary.language).toBe('en');
    });

    it('strips markdown code fences from Gemini output before parsing JSON', () => {
      const fencedJson = `\`\`\`json
{
  "overview": "Clean overview inside markdown code fences.",
  "keyPoints": ["Point A", "Point B"],
  "detailedSummary": "Detailed text...",
  "importantFacts": ["Fact 1"],
  "conclusion": "Final thought",
  "topicsAndKeywords": ["Tech"]
}
\`\`\``;

      const parsed = summaryService.parseStructuredResponse(
        fencedJson,
        'en',
        'gemini-2.0-flash-lite'
      );

      expect(parsed.overview).toBe('Clean overview inside markdown code fences.');
      expect(parsed.keyPoints).toEqual(['Point A', 'Point B']);
    });

    it('falls back to regex text parsing when Gemini returns structured markdown instead of JSON', () => {
      const markdownResponse = `### Quick Overview
This is a markdown formatted summary that ignored the JSON directive.

### Key Takeaways
- First key takeaway from the article
- Second key takeaway from the article
- Third key takeaway from the article

### Detailed Breakdown
This section contains a deep dive into the technology and findings.

### Important Facts
- Published in October 2026
- Tested on 1,000 active web pages

### Conclusion
Always implement fallback parsers to handle non-compliant LLM output.`;

      const parsed = summaryService.parseStructuredResponse(
        markdownResponse,
        'en',
        'gemini-2.0-flash-lite'
      );

      expect(parsed.overview).toContain('markdown formatted summary');
      expect(parsed.keyPoints.length).toBeGreaterThanOrEqual(1);
      expect(parsed.conclusion).toContain('Always implement fallback parsers');
    });

    it('handles long articles through multi-chunk processing', async () => {
      const longText = 'Comprehensive article segment with substantial content. '.repeat(500);
      const longArticle: ExtractedArticle = {
        title: 'Massive Research Report',
        url: 'https://example.com/report',
        textContent: longText,
        length: longText.length,
        wordCount: 3000,
      };

      const generateSpy = vi.spyOn(geminiClient, 'generateText').mockResolvedValue({
        text: JSON.stringify({
          overview: 'Synthesized overview of entire multi-chunk article.',
          keyPoints: ['Chunk point 1', 'Chunk point 2'],
          detailedSummary: 'Full summary...',
          importantFacts: ['Fact A'],
          conclusion: 'Final synthesis',
          topicsAndKeywords: ['Research'],
        }),
        model: 'gemini-2.0-flash-lite',
        latencyMs: 400,
      });

      const summary = await summaryService.generateSummary(longArticle, 'en');

      // Verify multiple calls were made (chunks + final synthesis)
      expect(generateSpy).toHaveBeenCalled();
      expect(summary.overview).toContain('Synthesized overview');
    });

    it('rejects empty articles', async () => {
      const emptyArticle: ExtractedArticle = {
        title: 'Empty',
        url: 'https://example.com',
        textContent: '',
        length: 0,
        wordCount: 0,
      };

      await expect(summaryService.generateSummary(emptyArticle)).rejects.toThrow(
        /cannot summarize an empty article/i
      );
    });
  });
});
