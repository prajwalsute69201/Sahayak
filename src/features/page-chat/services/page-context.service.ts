/**
 * Page Context Service
 * Extracts and cleans content from the active browser tab, supporting standard articles,
 * generic web pages, and YouTube video transcripts.
 */

import { PageContext, PageSection, PageLink } from '../types/chat.types';
import { articleExtractorService } from '@/features/article-summary/services/article-extractor.service';
import { extractArticleFromDocument } from '@/content/readabilityReader';
import {
  isYouTubeVideoUrl,
  parseYouTubeUrl,
} from '@/features/youtube-summary/services/youtube-detector.service';
import { retrieveYouTubeTranscript } from '@/features/youtube-summary/services/transcript.service';
import { TranscriptSegment } from '@/features/youtube-summary/types/youtube.types';
import { contextChunkerService } from './context-chunker.service';

export class PageContextService {
  private cache = new Map<string, PageContext>();

  /**
   * Extracts page context from the currently active browser tab.
   */
  public async extractContextFromActiveTab(): Promise<PageContext> {
    // 1. Check if running in browser extension environment
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      return this.extractFromLocalDocumentFallback();
    }

    // 2. Query active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      throw new Error('No active browser tab found. Please focus a web page and try again.');
    }

    const url = tab.url || '';
    const title = tab.title || 'Untitled Page';
    const domain = this.extractDomain(url);
    const tabId = tab.id;

    // 3. Detect restricted browser protocols
    if (this.isRestrictedUrl(url)) {
      const restrictedContext: PageContext = {
        id: `tab-${tabId}:${url}`,
        tabId,
        url,
        title,
        domain,
        contentType: 'generic',
        mainContent: 'This internal browser page is restricted and cannot be read by extensions.',
        sections: [],
        links: [],
        wordCount: 0,
        extractedAt: Date.now(),
        isTruncated: false,
        isRestricted: true,
        restrictionReason:
          'Chrome extensions cannot access internal browser pages (chrome://, edge://, about:). Please navigate to a standard public website or video.',
      };
      return restrictedContext;
    }

    // Check cache
    const cacheKey = `tab-${tabId}:${url}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.extractedAt < 60000) {
      return cached;
    }

    // 4. Branch based on content type: YouTube Video vs Standard Webpage / Article
    if (isYouTubeVideoUrl(url)) {
      const youtubeContext = await this.extractYouTubeContext(tabId, url, title, domain);
      this.cache.set(cacheKey, youtubeContext);
      return youtubeContext;
    }

    // Standard Webpage / Article Extraction
    const articleContext = await this.extractWebpageContext(tabId, url, title, domain);
    this.cache.set(cacheKey, articleContext);
    return articleContext;
  }

  /**
   * Refreshes and re-extracts the context for the active tab, bypassing the cache.
   */
  public async refreshContext(): Promise<PageContext> {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab?.url) {
        this.cache.delete(`tab-${tab.id}:${tab.url}`);
      }
    } else {
      this.cache.clear();
    }
    return this.extractContextFromActiveTab();
  }

  /**
   * Extracts context for a YouTube video using the transcript service.
   */
  private async extractYouTubeContext(
    tabId: number,
    url: string,
    title: string,
    domain: string
  ): Promise<PageContext> {
    const parsed = parseYouTubeUrl(url);
    const videoId = parsed.videoId || '';

    try {
      const transcriptResult = await retrieveYouTubeTranscript(url, 'en');

      if (
        transcriptResult.success &&
        transcriptResult.segments &&
        transcriptResult.segments.length > 0
      ) {
        const segments = transcriptResult.segments;
        const mainContent = transcriptResult.rawText || segments.map((s) => s.text).join(' ');
        const sections = this.buildYouTubeSections(segments);
        const wordCount = contextChunkerService.countWords(mainContent);

        return {
          id: `tab-${tabId}:${url}`,
          tabId,
          url,
          title: title.replace(/\s*-\s*YouTube$/i, '').trim(),
          domain,
          contentType: 'youtube',
          mainContent,
          sections,
          links: [{ text: 'Watch on YouTube', url }],
          wordCount,
          extractedAt: Date.now(),
          isTruncated: false,
          language: transcriptResult.language,
        };
      }

      // If transcript was not available, provide metadata context
      const fallbackSections: PageSection[] = [
        {
          id: 'sec-0',
          heading: 'Video Information',
          level: 1,
          content: `Video Title: ${title}\nVideo ID: ${videoId}\nCaptions are unavailable or restricted for this video. Questions can only be answered about video metadata.`,
          wordCount: 20,
          charCount: 150,
        },
      ];

      return {
        id: `tab-${tabId}:${url}`,
        tabId,
        url,
        title,
        domain,
        contentType: 'youtube',
        mainContent: `Video Title: ${title}. Captions are not available.`,
        sections: fallbackSections,
        links: [{ text: 'Watch on YouTube', url }],
        wordCount: 20,
        extractedAt: Date.now(),
        isTruncated: false,
      };
    } catch (err) {
      console.warn('[Sahayak PageContext] YouTube transcript extraction fallback:', err);
      return {
        id: `tab-${tabId}:${url}`,
        tabId,
        url,
        title,
        domain,
        contentType: 'youtube',
        mainContent: `YouTube Video: ${title}.`,
        sections: [
          {
            id: 'sec-0',
            heading: 'Video Information',
            level: 1,
            content: `Video Title: ${title}`,
            wordCount: 5,
            charCount: 30,
          },
        ],
        links: [],
        wordCount: 5,
        extractedAt: Date.now(),
        isTruncated: false,
      };
    }
  }

  /**
   * Groups YouTube transcript segments into chronological interval sections (~2-3 min intervals).
   */
  private buildYouTubeSections(segments: TranscriptSegment[]): PageSection[] {
    if (!segments || segments.length === 0) return [];

    const INTERVAL_SECONDS = 180; // 3 minutes per section
    const sections: PageSection[] = [];
    let currentInterval = 0;
    let currentParts: string[] = [];
    let intervalStartTimestamp = '00:00';

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const startSec = seg.startSeconds || 0;
      const intervalIndex = Math.floor(startSec / INTERVAL_SECONDS);

      if (intervalIndex !== currentInterval && currentParts.length > 0) {
        const endTimestamp = seg.timestamp || 'end';
        const heading = `[${intervalStartTimestamp} - ${endTimestamp}] Video Segment ${currentInterval + 1}`;
        const content = currentParts.join(' ');

        sections.push({
          id: `sec-yt-${currentInterval}`,
          heading,
          level: 2,
          content,
          wordCount: contextChunkerService.countWords(content),
          charCount: content.length,
        });

        currentInterval = intervalIndex;
        currentParts = [];
        intervalStartTimestamp = seg.timestamp || '00:00';
      }

      currentParts.push(seg.text.trim());
    }

    if (currentParts.length > 0) {
      const heading = `[${intervalStartTimestamp}+] Video Segment ${currentInterval + 1}`;
      const content = currentParts.join(' ');
      sections.push({
        id: `sec-yt-${currentInterval}`,
        heading,
        level: 2,
        content,
        wordCount: contextChunkerService.countWords(content),
        charCount: content.length,
      });
    }

    return sections;
  }

  /**
   * Extracts context for standard articles and webpages.
   */
  private async extractWebpageContext(
    tabId: number,
    url: string,
    title: string,
    domain: string
  ): Promise<PageContext> {
    try {
      const article = await articleExtractorService.extractFromActiveTab();

      // Convert extracted article sections or generate semantic chunks
      const rawSections: PageSection[] = (article.sections || []).map((s, idx) => ({
        id: `sec-${idx}`,
        heading: s.heading,
        level: s.level,
        content: s.content,
        wordCount: contextChunkerService.countWords(s.content),
        charCount: s.content.length,
      }));

      const chunkedSections = contextChunkerService.chunkPageContext({
        title: article.title || title,
        mainContent: article.textContent,
        sections: rawSections,
      });

      const links: PageLink[] = (article.links || []).map((l) => ({
        text: l.text,
        url: l.url,
      }));

      return {
        id: `tab-${tabId}:${url}`,
        tabId,
        url: article.url || url,
        title: article.title || title,
        domain,
        byline: article.byline,
        siteName: article.siteName,
        contentType: 'article',
        mainContent: article.textContent,
        sections: chunkedSections,
        links,
        wordCount: article.wordCount,
        extractedAt: Date.now(),
        isTruncated: false,
        language: article.lang,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Return a restricted or error context object
      return {
        id: `tab-${tabId}:${url}`,
        tabId,
        url,
        title,
        domain,
        contentType: 'generic',
        mainContent: '',
        sections: [],
        links: [],
        wordCount: 0,
        extractedAt: Date.now(),
        isTruncated: false,
        isRestricted: true,
        restrictionReason: errorMsg,
      };
    }
  }

  /**
   * Fallback extraction for tests / non-extension headless DOM environments.
   */
  private extractFromLocalDocumentFallback(): PageContext {
    if (typeof document !== 'undefined') {
      const res = extractArticleFromDocument(document);
      const url = document.location?.href || 'https://example.com/test';
      const domain = this.extractDomain(url);
      const title = res.article?.title || document.title || 'Local Document';

      if (res.success && res.article) {
        const rawSections: PageSection[] = (res.article.sections || []).map((s, idx) => ({
          id: `sec-${idx}`,
          heading: s.heading,
          level: s.level,
          content: s.content,
          wordCount: contextChunkerService.countWords(s.content),
          charCount: s.content.length,
        }));

        const chunked = contextChunkerService.chunkPageContext({
          title,
          mainContent: res.article.textContent,
          sections: rawSections,
        });

        return {
          id: `local:${url}`,
          url,
          title,
          domain,
          byline: res.article.byline,
          siteName: res.article.siteName,
          contentType: 'article',
          mainContent: res.article.textContent,
          sections: chunked,
          links: res.article.links || [],
          wordCount: res.article.wordCount,
          extractedAt: Date.now(),
          isTruncated: false,
          language: res.article.lang,
        };
      }
    }

    return {
      id: 'empty',
      url: 'about:blank',
      title: 'Unavailable',
      domain: '',
      contentType: 'generic',
      mainContent: 'No content available.',
      sections: [],
      links: [],
      wordCount: 0,
      extractedAt: Date.now(),
      isTruncated: false,
      isRestricted: true,
      restrictionReason: 'No browser tabs or document found.',
    };
  }

  /**
   * Checks if URL is a restricted internal browser protocol.
   */
  public isRestrictedUrl(url: string): boolean {
    if (!url) return true;
    return (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.startsWith('view-source:')
    );
  }

  /**
   * Extracts clean hostname from URL.
   */
  public extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
}

export const pageContextService = new PageContextService();
export default pageContextService;
