/**
 * Context Chunker Service
 * Partitions large web pages into meaningful, heading-preserved sections.
 */

import { PageContext, PageSection } from '../types/chat.types';

export class ContextChunkerService {
  public static readonly DEFAULT_MAX_CHUNK_WORDS = 800; // ~3,500 characters
  public static readonly DEFAULT_MAX_CHUNK_CHARS = 4000;
  public static readonly CHUNKING_THRESHOLD_CHARS = 8000; // ~1,800 words

  /**
   * Checks whether the page content exceeds the standard single-pass threshold.
   */
  public shouldChunk(
    textLength: number,
    threshold = ContextChunkerService.CHUNKING_THRESHOLD_CHARS
  ): boolean {
    return textLength > threshold;
  }

  /**
   * Processes a PageContext and produces a refined list of structured, heading-aware sections.
   */
  public chunkPageContext(
    context: Pick<PageContext, 'title' | 'mainContent' | 'sections'>,
    maxChunkChars = ContextChunkerService.DEFAULT_MAX_CHUNK_CHARS
  ): PageSection[] {
    const rawSections = context.sections || [];

    // If explicit sections were already extracted with headings
    if (rawSections.length > 0) {
      const refinedSections: PageSection[] = [];

      for (let i = 0; i < rawSections.length; i++) {
        const sec = rawSections[i];
        if (sec.content.length <= maxChunkChars) {
          refinedSections.push({
            ...sec,
            id: sec.id || `sec-${i}`,
            wordCount: sec.wordCount || this.countWords(sec.content),
            charCount: sec.content.length,
          });
        } else {
          // Split oversized section into numbered parts while preserving heading
          const subSections = this.splitOversizedSection(sec, i, maxChunkChars);
          refinedSections.push(...subSections);
        }
      }

      return refinedSections;
    }

    // Otherwise, build semantic sections from mainContent paragraphs
    return this.createSectionsFromRawText(context.mainContent, context.title, maxChunkChars);
  }

  /**
   * Splits an oversized section into sub-parts, preserving the heading name.
   */
  private splitOversizedSection(
    section: PageSection,
    sectionIndex: number,
    maxChunkChars: number
  ): PageSection[] {
    const paragraphs = section.content.split(/\n\s*\n/).filter((p) => p.trim());
    if (paragraphs.length <= 1) {
      // Hard split on sentences if single huge paragraph
      return this.splitBySentences(
        section.content,
        section.heading,
        section.level,
        sectionIndex,
        maxChunkChars
      );
    }

    const subSections: PageSection[] = [];
    let currentPart = 1;
    let currentText = '';

    for (const para of paragraphs) {
      if (currentText.length + para.length + 2 > maxChunkChars && currentText.length > 0) {
        subSections.push({
          id: `sec-${sectionIndex}-p${currentPart}`,
          heading: `${section.heading} (Part ${currentPart})`,
          level: section.level,
          content: currentText.trim(),
          wordCount: this.countWords(currentText),
          charCount: currentText.trim().length,
        });
        currentPart++;
        currentText = para;
      } else {
        currentText = currentText ? `${currentText}\n\n${para}` : para;
      }
    }

    if (currentText.trim()) {
      subSections.push({
        id: `sec-${sectionIndex}-p${currentPart}`,
        heading: currentPart === 1 ? section.heading : `${section.heading} (Part ${currentPart})`,
        level: section.level,
        content: currentText.trim(),
        wordCount: this.countWords(currentText),
        charCount: currentText.trim().length,
      });
    }

    return subSections;
  }

  /**
   * Fallback: creates semantic sections from raw unstructured text.
   */
  public createSectionsFromRawText(
    text: string,
    documentTitle: string,
    maxChunkChars: number = ContextChunkerService.DEFAULT_MAX_CHUNK_CHARS
  ): PageSection[] {
    const cleanText = text.trim();
    if (!cleanText) {
      return [
        {
          id: 'sec-0',
          heading: documentTitle || 'Overview',
          level: 1,
          content: 'No readable content extracted.',
          wordCount: 0,
          charCount: 0,
        },
      ];
    }

    // Check for markdown headings in text (e.g. ## Heading)
    const mdHeadingRegex = /^(#{1,6})\s+(.+)$/gm;
    const matches = Array.from(cleanText.matchAll(mdHeadingRegex));

    if (matches.length >= 2) {
      const sections: PageSection[] = [];
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const heading = match[2].trim();
        const level = match[1].length;
        const startIndex = (match.index || 0) + match[0].length;
        const nextIndex = i + 1 < matches.length ? matches[i + 1].index : cleanText.length;
        const content = cleanText.substring(startIndex, nextIndex).trim();

        sections.push({
          id: `sec-${i}`,
          heading,
          level,
          content: content || heading,
          wordCount: this.countWords(content || heading),
          charCount: (content || heading).length,
        });
      }
      return sections;
    }

    // Otherwise split by paragraphs into structured blocks
    const paragraphs = cleanText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const sections: PageSection[] = [];
    let currentPart = 1;
    let currentText = '';

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      if (currentText.length + para.length + 2 > maxChunkChars && currentText.length > 0) {
        const heading =
          currentPart === 1
            ? 'Introduction'
            : i >= paragraphs.length - 2
              ? 'Conclusion & Takeaways'
              : `Section ${currentPart}`;

        sections.push({
          id: `sec-${currentPart - 1}`,
          heading,
          level: 2,
          content: currentText.trim(),
          wordCount: this.countWords(currentText),
          charCount: currentText.trim().length,
        });
        currentPart++;
        currentText = para;
      } else {
        currentText = currentText ? `${currentText}\n\n${para}` : para;
      }
    }

    if (currentText.trim()) {
      const heading = currentPart === 1 ? documentTitle || 'Overview' : `Section ${currentPart}`;

      sections.push({
        id: `sec-${currentPart - 1}`,
        heading,
        level: 2,
        content: currentText.trim(),
        wordCount: this.countWords(currentText),
        charCount: currentText.trim().length,
      });
    }

    return sections;
  }

  /**
   * Helper: splits text by sentence boundary when no paragraph breaks exist.
   */
  private splitBySentences(
    text: string,
    baseHeading: string,
    level: number,
    sectionIndex: number,
    maxChunkChars: number
  ): PageSection[] {
    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];
    const subSections: PageSection[] = [];
    let currentPart = 1;
    let currentText = '';

    for (const sentence of sentences) {
      if (currentText.length + sentence.length > maxChunkChars && currentText.length > 0) {
        subSections.push({
          id: `sec-${sectionIndex}-p${currentPart}`,
          heading: `${baseHeading} (Part ${currentPart})`,
          level,
          content: currentText.trim(),
          wordCount: this.countWords(currentText),
          charCount: currentText.trim().length,
        });
        currentPart++;
        currentText = sentence;
      } else {
        currentText += sentence;
      }
    }

    if (currentText.trim()) {
      subSections.push({
        id: `sec-${sectionIndex}-p${currentPart}`,
        heading: currentPart === 1 ? baseHeading : `${baseHeading} (Part ${currentPart})`,
        level,
        content: currentText.trim(),
        wordCount: this.countWords(currentText),
        charCount: currentText.trim().length,
      });
    }

    return subSections;
  }

  /**
   * Counts words in a string.
   */
  public countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
}

export const contextChunkerService = new ContextChunkerService();
export default contextChunkerService;
