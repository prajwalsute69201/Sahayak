/**
 * Sahayak Article Extractor Service
 * Coordinates extraction requests between the Side Panel and the active browser tab.
 */

import { ExtractedArticle, ExtractionResult } from '../types/article.types';
import { extractArticleFromDocument } from '@/content/readabilityReader';

export class ArticleExtractorService {
  /**
   * Retrieves extracted article content from the currently active browser tab.
   */
  public async extractFromActiveTab(): Promise<ExtractedArticle> {
    // Check if running in headless / test environment without active Chrome tabs API
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      if (typeof document !== 'undefined') {
        const localRes = extractArticleFromDocument(document);
        if (localRes.success && localRes.article) {
          return localRes.article;
        }
        throw new Error(localRes.error?.message || 'No article content found in document.');
      }
      throw new Error('Chrome tabs API is unavailable.');
    }

    // 1. Query active tab in current window
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      throw new Error('No active browser tab found. Please focus a web page and try again.');
    }

    const url = tab.url || '';

    // 2. Check for restricted protocols
    if (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.startsWith('view-source:')
    ) {
      throw new Error(
        'Chrome extensions cannot access internal browser pages (chrome://, edge://, about:). Please navigate to a standard public website or article.'
      );
    }

    // 3. Send message to content script
    try {
      const response = await this.sendMessageToTab<ExtractionResult>(tab.id, {
        type: 'EXTRACT_ARTICLE',
      });

      if (response && response.success && response.article) {
        return response.article;
      }

      if (response && response.error) {
        throw new Error(response.error.message);
      }
    } catch (msgErr: unknown) {
      const errStr = msgErr instanceof Error ? msgErr.message : String(msgErr);

      // If content script is not yet injected (e.g. tab opened before extension loaded),
      // fallback to dynamic script execution via chrome.scripting.executeScript
      if (
        errStr.includes('Could not establish connection') ||
        errStr.includes('Receiving end does not exist')
      ) {
        return await this.fallbackScriptExecution(tab.id, url);
      }

      throw msgErr;
    }

    throw new Error('Failed to retrieve readable article content from the page.');
  }

  /**
   * Fallback script injection when content script was not pre-injected into the tab.
   */
  private async fallbackScriptExecution(tabId: number, tabUrl: string): Promise<ExtractedArticle> {
    if (!chrome.scripting?.executeScript) {
      throw new Error(
        'Content script connection failed. Please refresh the web page to enable Sahayak.'
      );
    }

    try {
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Inline basic DOM text extraction fallback
          const title = document.title || 'Untitled';
          const articleEl =
            document.querySelector('article') ||
            document.querySelector('main') ||
            document.querySelector('[role="main"]');

          let textContent = articleEl?.textContent?.trim() || '';

          if (!textContent || textContent.length < 150) {
            const paragraphs = Array.from(document.querySelectorAll('p'))
              .map((p) => p.textContent?.trim() || '')
              .filter((p) => p.length > 25);
            textContent = paragraphs.join('\n\n');
          }

          if (!textContent || textContent.length < 80) {
            return {
              success: false,
              error: {
                code: 'NO_READABLE_CONTENT',
                message: 'No readable article content found on this page.',
              },
            };
          }

          const words = textContent.split(/\s+/).filter(Boolean);

          return {
            success: true,
            article: {
              title,
              siteName: window.location.hostname.replace(/^www\./, ''),
              textContent,
              length: textContent.length,
              wordCount: words.length,
              url: window.location.href,
            },
          };
        },
      });

      const res = injectionResults?.[0]?.result as ExtractionResult | undefined;

      if (res?.success && res.article) {
        return res.article;
      }

      throw new Error(res?.error?.message || 'Could not extract article content from the page.');
    } catch (execErr) {
      console.warn('[Sahayak Extractor] Script injection fallback error:', execErr);
      throw new Error(
        `Failed to access page content (${tabUrl}). Please refresh the page and try again.`
      );
    }
  }

  private sendMessageToTab<T>(tabId: number, message: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(response as T);
      });
    });
  }
}

export const articleExtractorService = new ArticleExtractorService();
export default articleExtractorService;
