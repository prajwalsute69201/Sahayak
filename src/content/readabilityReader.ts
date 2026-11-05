/**
 * Sahayak Article Extractor Engine
 * Uses Mozilla Readability and DOMPurify on a cloned document to safely parse web articles.
 */

import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import {
  ExtractedArticle,
  ExtractionResult,
  ExtractedSection,
  ExtractedLink,
} from '@/features/article-summary/types/article.types';

/**
 * Extracts structured headings and text content from a DOM node.
 */
export function extractSectionsFromDoc(doc: Document): ExtractedSection[] {
  const sections: ExtractedSection[] = [];
  const container =
    doc.querySelector('article') ||
    doc.querySelector('main') ||
    doc.querySelector('[role="main"]') ||
    doc.body;

  if (!container) return sections;

  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));

  if (headings.length > 0) {
    for (let i = 0; i < headings.length; i++) {
      const headingEl = headings[i];
      const headingText = DOMPurify.sanitize(headingEl.textContent?.trim() || '', {
        ALLOWED_TAGS: [],
      }).trim();
      const level = parseInt(headingEl.tagName.replace(/^H/i, ''), 10) || 2;

      const contentParts: string[] = [];
      let nextNode = headingEl.nextElementSibling;
      while (nextNode && !/^H[1-6]$/i.test(nextNode.tagName)) {
        const text = DOMPurify.sanitize(nextNode.textContent?.trim() || '', {
          ALLOWED_TAGS: [],
        }).trim();
        if (text) contentParts.push(text);
        nextNode = nextNode.nextElementSibling;
      }

      const content = contentParts.join('\n\n');
      if (headingText && (content || i === 0)) {
        sections.push({
          heading: headingText,
          level,
          content: content || headingText,
        });
      }
    }
  }

  return sections;
}

/**
 * Extracts relevant content links from a DOM node.
 */
export function extractLinksFromDoc(doc: Document): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const seenUrls = new Set<string>();

  const container =
    doc.querySelector('article') ||
    doc.querySelector('main') ||
    doc.querySelector('[role="main"]') ||
    doc.body;

  if (!container) return links;

  const linkElements = Array.from(container.querySelectorAll('a[href]'));

  for (const el of linkElements) {
    const href = el.getAttribute('href')?.trim();
    const text = el.textContent?.trim();

    if (
      href &&
      text &&
      text.length >= 2 &&
      !href.startsWith('javascript:') &&
      !href.startsWith('#') &&
      !seenUrls.has(href)
    ) {
      seenUrls.add(href);
      links.push({
        text: DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }).trim(),
        url: href,
      });

      if (links.length >= 25) break;
    }
  }

  return links;
}

export function extractArticleFromDocument(doc: Document = document): ExtractionResult {
  try {
    const url = doc.location?.href || window.location.href;

    // Check for restricted or empty documents
    if (!doc.body || doc.body.children.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_READABLE_CONTENT',
          message: 'The current page does not contain any readable HTML content.',
        },
      };
    }

    // 1. Clone DOM to avoid mutating host page
    const documentClone = doc.cloneNode(true) as Document;

    // 2. Remove script, style, noscript, and iframe tags
    const removableSelectors = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas'];
    removableSelectors.forEach((selector) => {
      documentClone.querySelectorAll(selector).forEach((el) => el.remove());
    });

    // 3. Extract Metadata from meta tags
    const getMeta = (names: string[]): string | undefined => {
      for (const name of names) {
        const el =
          doc.querySelector(`meta[property="${name}"]`) ||
          doc.querySelector(`meta[name="${name}"]`);
        const content = el?.getAttribute('content')?.trim();
        if (content) return content;
      }
      return undefined;
    };

    const siteName =
      getMeta(['og:site_name', 'twitter:app:name:iphone', 'application-name']) ||
      doc.location?.hostname?.replace(/^www\./, '') ||
      '';

    const byline = getMeta([
      'author',
      'article:author',
      'twitter:creator',
      'dc.creator',
      'sailthru.author',
    ]);

    const publishedTime = getMeta([
      'article:published_time',
      'datePublished',
      'og:pubdate',
      'pubdate',
      'parsely-pub-date',
    ]);

    // 4. Run Mozilla Readability
    let parsed: ReturnType<Readability['parse']> = null;
    try {
      const reader = new Readability(documentClone, {
        charThreshold: 80,
        classesToPreserve: [],
      });
      parsed = reader.parse();
    } catch (err) {
      console.warn('[Sahayak Readability] Parser error:', err);
    }

    let title = parsed?.title?.trim() || doc.title?.trim() || 'Untitled Article';
    let textContent = parsed?.textContent?.trim() || '';
    const excerpt = parsed?.excerpt?.trim() || getMeta(['og:description', 'description']);

    // 5. Fallback extraction if Readability failed or extracted insufficient text
    if (!textContent || textContent.length < 150) {
      const candidateElements = [
        doc.querySelector('article'),
        doc.querySelector('[role="main"]'),
        doc.querySelector('main'),
        doc.querySelector('.article-content'),
        doc.querySelector('.post-content'),
        doc.querySelector('#content'),
      ];

      for (const el of candidateElements) {
        if (el && el.textContent && el.textContent.trim().length >= 150) {
          textContent = el.textContent.trim();
          break;
        }
      }

      // Final paragraph collection fallback
      if (!textContent || textContent.length < 150) {
        const paragraphs = Array.from(doc.querySelectorAll('p'))
          .map((p) => p.textContent?.trim() || '')
          .filter((t) => t.length > 30);

        if (paragraphs.length >= 3) {
          textContent = paragraphs.join('\n\n');
        }
      }
    }

    // 6. Validate minimum content threshold
    if (!textContent || textContent.length < 100) {
      return {
        success: false,
        error: {
          code: 'NO_READABLE_CONTENT',
          message:
            'Could not find readable article text on this page. Make sure you are viewing an article or text-heavy page.',
        },
      };
    }

    // 7. Sanitize output text using DOMPurify
    title = DOMPurify.sanitize(title, { ALLOWED_TAGS: [] }).trim();
    textContent = DOMPurify.sanitize(textContent, { ALLOWED_TAGS: [] }).trim();

    // Clean up excessive empty lines
    textContent = textContent.replace(/\n\s*\n\s*\n+/g, '\n\n');

    const words = textContent.split(/\s+/).filter(Boolean);
    const sections = extractSectionsFromDoc(documentClone);
    const links = extractLinksFromDoc(documentClone);

    const article: ExtractedArticle = {
      title,
      byline: byline
        ? DOMPurify.sanitize(byline, { ALLOWED_TAGS: [] }).trim()
        : parsed?.byline?.trim(),
      siteName: siteName ? DOMPurify.sanitize(siteName, { ALLOWED_TAGS: [] }).trim() : undefined,
      publishedTime,
      textContent,
      length: textContent.length,
      wordCount: words.length,
      excerpt: excerpt ? DOMPurify.sanitize(excerpt, { ALLOWED_TAGS: [] }).trim() : undefined,
      url,
      lang: doc.documentElement?.lang || 'en',
      sections: sections.length > 0 ? sections : undefined,
      links: links.length > 0 ? links : undefined,
    };

    return {
      success: true,
      article,
    };
  } catch (err) {
    console.error('[Sahayak Extractor] Unexpected extraction error:', err);
    return {
      success: false,
      error: {
        code: 'NO_READABLE_CONTENT',
        message: err instanceof Error ? err.message : 'Failed to extract article content.',
      },
    };
  }
}
