/**
 * Context Retrieval Service
 * Lightweight BM25/TF-IDF keyword and heading retrieval for page grounding.
 */

import { PageContext, PageSection, RetrievedContext, RetrievedSection } from '../types/chat.types';

export class ContextRetrievalService {
  public static readonly DEFAULT_MAX_WORDS_BUDGET = 3000; // ~14,000 characters
  public static readonly FULL_PASS_THRESHOLD_WORDS = 2500;

  private static readonly STOP_WORDS = new Set([
    'a',
    'about',
    'above',
    'after',
    'again',
    'against',
    'all',
    'am',
    'an',
    'and',
    'any',
    'are',
    "aren't",
    'as',
    'at',
    'be',
    'because',
    'been',
    'before',
    'being',
    'below',
    'between',
    'both',
    'but',
    'by',
    'can',
    "can't",
    'cannot',
    'could',
    "couldn't",
    'did',
    "didn't",
    'do',
    'does',
    "doesn't",
    'doing',
    "don't",
    'down',
    'during',
    'each',
    'few',
    'for',
    'from',
    'further',
    'had',
    "hadn't",
    'has',
    "hasn't",
    'have',
    "haven't",
    'having',
    'he',
    "he'd",
    "he'll",
    "he's",
    'her',
    'here',
    "here's",
    'hers',
    'herself',
    'him',
    'himself',
    'his',
    'how',
    "how's",
    'i',
    "i'd",
    "i'll",
    "i'm",
    "i've",
    'if',
    'in',
    'into',
    'is',
    "isn't",
    'it',
    "it's",
    'its',
    'itself',
    "let's",
    'me',
    'more',
    'most',
    "mustn't",
    'my',
    'myself',
    'no',
    'nor',
    'not',
    'of',
    'off',
    'on',
    'once',
    'only',
    'or',
    'other',
    'ought',
    'our',
    'ours',
    'ourselves',
    'out',
    'over',
    'own',
    'same',
    "shan't",
    'she',
    "she'd",
    "she'll",
    "she's",
    'should',
    "shouldn't",
    'so',
    'some',
    'such',
    'than',
    'that',
    "that's",
    'the',
    'their',
    'theirs',
    'them',
    'themselves',
    'then',
    'there',
    "there's",
    'these',
    'they',
    "they'd",
    "they'll",
    "they're",
    "they've",
    'this',
    'those',
    'through',
    'to',
    'too',
    'under',
    'until',
    'up',
    'very',
    'was',
    "wasn't",
    'we',
    "we'd",
    "we'll",
    "we're",
    "we've",
    'were',
    "weren't",
    'what',
    "what's",
    'when',
    "when's",
    'where',
    "where's",
    'which',
    'while',
    'who',
    "who's",
    'whom',
    'why',
    "why's",
    'with',
    "won't",
    'would',
    "wouldn't",
    'you',
    "you'd",
    "you'll",
    "you're",
    "you've",
    'your',
    'yours',
    'yourself',
    'yourselves',
    'tell',
    'explain',
    'give',
    'list',
    'show',
    'please',
  ]);

  /**
   * Retrieves the most relevant sections from a PageContext for a given question.
   */
  public retrieveRelevantSections(
    context: PageContext,
    question: string,
    maxWordsBudget = ContextRetrievalService.DEFAULT_MAX_WORDS_BUDGET
  ): RetrievedContext {
    const sections = context.sections || [];

    // Fallback if no sections exist
    if (sections.length === 0) {
      return {
        pageTitle: context.title,
        pageUrl: context.url,
        domain: context.domain,
        contentType: context.contentType,
        sections: [
          {
            id: 'sec-0',
            heading: context.title || 'Page Content',
            level: 1,
            content: context.mainContent || 'No page content available.',
            wordCount: context.wordCount || 0,
            charCount: (context.mainContent || '').length,
            relevanceScore: 1.0,
            matchReasons: ['default_fallback'],
          },
        ],
        totalRetrievedWords: context.wordCount || 0,
        isPartialContext: false,
        unretrievedSectionCount: 0,
        suggestedQuestions: this.generateSuggestedQuestions(context),
      };
    }

    // 1. Total content word count check
    const totalWords = sections.reduce((sum, s) => sum + (s.wordCount || 0), 0);
    const isSmallDocument = totalWords <= ContextRetrievalService.FULL_PASS_THRESHOLD_WORDS;

    // 2. Identify if question is a general / broad overview question
    const isGeneralQuery = this.isBroadQuestion(question);

    // 3. Score all sections
    const scoredSections = this.scoreSections(sections, question, isGeneralQuery);

    // 4. If small document or general query where all fits
    if (isSmallDocument && totalWords <= maxWordsBudget) {
      const allRetrieved: RetrievedSection[] = scoredSections
        .sort((a, b) => this.extractSectionOrder(a.id) - this.extractSectionOrder(b.id))
        .map((s) => ({
          ...s,
          relevanceScore: Math.max(s.relevanceScore, 1.0),
        }));

      return {
        pageTitle: context.title,
        pageUrl: context.url,
        domain: context.domain,
        contentType: context.contentType,
        sections: allRetrieved,
        totalRetrievedWords: totalWords,
        isPartialContext: false,
        unretrievedSectionCount: 0,
        suggestedQuestions: this.generateSuggestedQuestions(context),
      };
    }

    // 5. Select sections within budget based on relevance scores
    // Sort descending by score
    const sortedByRelevance = [...scoredSections].sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );

    const selected: RetrievedSection[] = [];
    let accumulatedWords = 0;

    // For general queries, ensure the first section (intro) is always selected
    if (isGeneralQuery && sections.length > 0) {
      const firstSec = scoredSections[0];
      selected.push(firstSec);
      accumulatedWords += firstSec.wordCount || 0;
    }

    for (const sec of sortedByRelevance) {
      if (selected.some((s) => s.id === sec.id)) continue;

      const secWords = sec.wordCount || 0;
      if (accumulatedWords + secWords <= maxWordsBudget || selected.length === 0) {
        selected.push(sec);
        accumulatedWords += secWords;
      } else {
        // Budget limit reached
        break;
      }
    }

    // Restore natural reading document order
    selected.sort((a, b) => this.extractSectionOrder(a.id) - this.extractSectionOrder(b.id));

    const isPartialContext = selected.length < sections.length;
    const unretrievedCount = sections.length - selected.length;

    return {
      pageTitle: context.title,
      pageUrl: context.url,
      domain: context.domain,
      contentType: context.contentType,
      sections: selected,
      totalRetrievedWords: accumulatedWords,
      isPartialContext,
      unretrievedSectionCount: unretrievedCount,
      suggestedQuestions: this.generateSuggestedQuestions(context),
    };
  }

  /**
   * Scores individual sections against user query keywords and structure.
   */
  private scoreSections(
    sections: PageSection[],
    question: string,
    isGeneralQuery: boolean
  ): RetrievedSection[] {
    const queryTokens = this.tokenize(question);
    const totalDocs = sections.length;

    // Calculate document frequency for IDF
    const docFrequency = new Map<string, number>();
    sections.forEach((sec) => {
      const secTokens = new Set([...this.tokenize(sec.heading), ...this.tokenize(sec.content)]);
      secTokens.forEach((t) => {
        docFrequency.set(t, (docFrequency.get(t) || 0) + 1);
      });
    });

    const targetSectionIndex = this.detectExplicitSectionIndex(question);

    return sections.map((sec, idx) => {
      let score = 0;
      const matchReasons: string[] = [];

      // 1. Explicit Section Index Match (e.g. "second section", "section 2")
      if (targetSectionIndex !== null && idx === targetSectionIndex) {
        score += 15.0;
        matchReasons.push('explicit_section_target');
      }

      // 2. Exact phrase in heading
      const cleanHeading = sec.heading.toLowerCase();
      const cleanQuestion = question.toLowerCase();
      if (cleanHeading.length > 3 && cleanQuestion.includes(cleanHeading)) {
        score += 8.0;
        matchReasons.push('exact_heading_phrase');
      }

      // 3. Heading Token Overlap (with boost)
      const headingTokens = new Set(this.tokenize(sec.heading));
      let headingMatches = 0;
      for (const qToken of queryTokens) {
        if (headingTokens.has(qToken)) {
          headingMatches++;
          score += 4.0;
        }
      }
      if (headingMatches > 0) {
        matchReasons.push(`heading_tokens_${headingMatches}`);
      }

      // 4. Content Token Matches with TF-IDF Weighting
      const contentTokens = this.tokenize(sec.content);
      const tokenCounts = new Map<string, number>();
      contentTokens.forEach((t) => tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1));

      let contentScore = 0;
      for (const qToken of queryTokens) {
        const count = tokenCounts.get(qToken) || 0;
        if (count > 0) {
          const df = docFrequency.get(qToken) || 1;
          const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
          // Sub-linear term frequency scaling
          const tf = Math.sqrt(count);
          contentScore += tf * Math.max(idf, 0.2);
        }
      }

      if (contentScore > 0) {
        score += contentScore;
        matchReasons.push(`content_tf_idf_${contentScore.toFixed(1)}`);
      }

      // 5. General query baseline: favor intro and conclusion
      if (isGeneralQuery) {
        if (idx === 0) {
          score += 5.0;
          matchReasons.push('general_query_intro_boost');
        } else if (idx === sections.length - 1) {
          score += 3.0;
          matchReasons.push('general_query_conclusion_boost');
        } else {
          score += 1.0;
        }
      }

      // Ensure minimum non-zero score
      const finalScore = Math.round(score * 100) / 100;

      return {
        ...sec,
        relevanceScore: finalScore,
        matchReasons,
      };
    });
  }

  /**
   * Tokenizes text into lowercase alphanumeric keywords, filtering stopwords.
   */
  public tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !ContextRetrievalService.STOP_WORDS.has(t));
  }

  /**
   * Detects whether user question refers explicitly to a section number or position.
   * Returns 0-based index or null.
   */
  public detectExplicitSectionIndex(question: string): number | null {
    const q = question.toLowerCase();

    const ordinalMap: Record<string, number> = {
      'first section': 0,
      '1st section': 0,
      'section 1': 0,
      'second section': 1,
      '2nd section': 1,
      'section 2': 1,
      'third section': 2,
      '3rd section': 2,
      'section 3': 2,
      'fourth section': 3,
      '4th section': 3,
      'section 4': 3,
      'fifth section': 4,
      '5th section': 4,
      'section 5': 4,
      intro: 0,
      introduction: 0,
    };

    for (const [phrase, index] of Object.entries(ordinalMap)) {
      if (q.includes(phrase)) {
        return index;
      }
    }

    return null;
  }

  /**
   * Detects if question is a high-level overview request.
   */
  public isBroadQuestion(question: string): boolean {
    const q = question.toLowerCase().trim();
    const broadPhrases = [
      'what is this article about',
      'what is this page about',
      'what is this video about',
      'summarize',
      'summary',
      'overview',
      'main arguments',
      'main points',
      'key takeaways',
      'tl;dr',
      'tldr',
      'explain the page',
      'what does this say',
    ];

    return broadPhrases.some((phrase) => q.includes(phrase));
  }

  /**
   * Generates helpful suggested starter questions based on page metadata and sections.
   */
  public generateSuggestedQuestions(context: PageContext): string[] {
    const suggestions: string[] = [];

    if (context.contentType === 'youtube') {
      suggestions.push('What are the key takeaways from this video?');
      suggestions.push('What topics are covered in the video?');
      suggestions.push('Explain this video in Hinglish.');
    } else {
      suggestions.push('What is this article about?');
      suggestions.push('What are the main arguments?');
      suggestions.push('List all the important statistics mentioned.');
      suggestions.push('Explain this in Hinglish.');
    }

    // Add section-specific question if available
    const firstNonIntroSection = context.sections?.find(
      (s) => s.level >= 2 && s.heading !== 'Overview'
    );
    if (firstNonIntroSection) {
      suggestions.push(`Explain "${firstNonIntroSection.heading}" in simple words.`);
    }

    return suggestions.slice(0, 4);
  }

  /**
   * Helper to parse numerical index from section ID (e.g. "sec-2" -> 2).
   */
  private extractSectionOrder(id: string): number {
    const match = id.match(/sec-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

export const contextRetrievalService = new ContextRetrievalService();
export default contextRetrievalService;
