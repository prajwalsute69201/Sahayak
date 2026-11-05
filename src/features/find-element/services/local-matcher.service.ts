/**
 * Sahayak Local Element Matcher Service
 * Fast, deterministic on-device keyword and semantic matching that operates
 * completely offline without requiring LLM calls or API keys.
 */

import { ScannedElement, ElementCategory } from '@/features/element-scanner';
import { ElementMatch } from '../types/find-element.types';

export class LocalMatcherService {
  /** Stop words in English and Hinglish to strip out of queries */
  private readonly STOP_WORDS = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'and',
    'or',
    'please',
    'show',
    'me',
    'find',
    'locate',
    'where',
    'can',
    'i',
    'get',
    // Hinglish query words
    'kahan',
    'hai',
    'dhoondo',
    'dhoondho',
    'dikhao',
    'batao',
    'mujhe',
    'chahiye',
    'ka',
    'ki',
    'ke',
    'karo',
    'karna',
    'wala',
    'wali',
    'wale',
  ]);

  /** Synonyms and intent expansion dictionary */
  private readonly SYNONYM_MAP: Record<string, string[]> = {
    login: ['sign in', 'signin', 'log in', 'account', 'enter'],
    signin: ['login', 'log in', 'sign in', 'account'],
    signup: ['register', 'sign up', 'create account', 'join'],
    register: ['sign up', 'signup', 'create account', 'join'],
    search: ['find', 'lookup', 'query', 'khoj', 'dhoondh', 'filter'],
    cart: ['bag', 'basket', 'checkout', 'buy', 'order'],
    email: ['mail', 'e-mail', 'username', 'login-id'],
    password: ['pass', 'secret', 'credential'],
    submit: ['send', 'confirm', 'save', 'continue', 'proceed', 'done'],
    cancel: ['close', 'dismiss', 'back', 'reset', 'exit'],
    download: ['export', 'save as', 'get file', 'pdf'],
    support: ['help', 'contact', 'customer service', 'chat'],
    next: ['forward', 'continue', 'proceed', 'page 2'],
    prev: ['previous', 'back'],
  };

  /**
   * Matches candidate elements against a natural-language query using local scoring.
   */
  public match(query: string, candidates: ScannedElement[]): ElementMatch[] {
    if (!query || query.trim().length === 0 || candidates.length === 0) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const queryTokens = this.tokenize(normalizedQuery);
    const expandedTokens = this.expandTokens(queryTokens);

    const matches: ElementMatch[] = [];

    for (const el of candidates) {
      const score = this.calculateMatchScore(el, normalizedQuery, queryTokens, expandedTokens);

      if (score >= 0.4) {
        matches.push({
          actionId: el.actionId,
          element: el,
          confidence: Math.round(score * 100) / 100,
          reason: this.generateReason(el, normalizedQuery, score),
          source: 'local',
        });
      }
    }

    // Sort descending by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  private calculateMatchScore(
    el: ScannedElement,
    rawQuery: string,
    tokens: string[],
    expandedTokens: string[]
  ): number {
    let score = 0.0;

    const labelLower = el.label.toLowerCase();
    const phLower = (el.placeholder || '').toLowerCase();
    const nameLower = (el.name || '').toLowerCase();
    const ariaLower = (el.ariaLabel || '').toLowerCase();
    const tagLower = el.tagName.toLowerCase();
    const typeLower = (el.type || '').toLowerCase();

    // 1. Exact match on label or placeholder
    if (labelLower === rawQuery || (phLower && phLower === rawQuery)) {
      return 0.96;
    }

    // 2. Query contains exact label or label contains query
    if (labelLower.length > 2 && rawQuery.includes(labelLower)) {
      score = Math.max(score, 0.88);
    } else if (rawQuery.length > 2 && labelLower.includes(rawQuery)) {
      score = Math.max(score, 0.82);
    }

    // 3. Placeholder match
    if (phLower && (rawQuery.includes(phLower) || phLower.includes(rawQuery))) {
      score = Math.max(score, 0.85);
    }

    // 4. Token overlap scoring
    let tokenMatches = 0;
    for (const token of tokens) {
      if (
        labelLower.includes(token) ||
        phLower.includes(token) ||
        nameLower.includes(token) ||
        ariaLower.includes(token)
      ) {
        tokenMatches++;
      }
    }

    if (tokens.length > 0 && tokenMatches > 0) {
      const tokenRatio = tokenMatches / tokens.length;
      score = Math.max(score, 0.5 + tokenRatio * 0.35);
    }

    // 5. Synonym / expanded token match
    for (const syn of expandedTokens) {
      if (labelLower.includes(syn) || phLower.includes(syn) || nameLower.includes(syn)) {
        score = Math.max(score, 0.75);
        break;
      }
    }

    // 6. Category alignment bonus
    const catBonus = this.checkCategoryRelevance(rawQuery, el.category);
    if (catBonus > 0) {
      score = Math.min(1.0, score + catBonus);
    }

    // 7. Structural tag / type alignment
    if (
      (rawQuery.includes('button') && (tagLower === 'button' || typeLower === 'button')) ||
      (rawQuery.includes('input') && tagLower === 'input') ||
      (rawQuery.includes('link') && tagLower === 'a') ||
      (rawQuery.includes('search') && el.category === 'search-field')
    ) {
      score = Math.min(1.0, score + 0.1);
    }

    // 8. Visibility & enabled bonus
    if (el.isVisible && el.isEnabled) {
      score = Math.min(1.0, score + 0.05);
    }

    return Math.min(1.0, score);
  }

  private checkCategoryRelevance(rawQuery: string, category: ElementCategory): number {
    if (
      category === 'search-field' &&
      (rawQuery.includes('search') || rawQuery.includes('khoj') || rawQuery.includes('find'))
    ) {
      return 0.25;
    }

    if (
      category === 'navigation' &&
      (rawQuery.includes('nav') ||
        rawQuery.includes('menu') ||
        rawQuery.includes('link') ||
        rawQuery.includes('page') ||
        rawQuery.includes('home'))
    ) {
      return 0.15;
    }

    if (
      category === 'media-control' &&
      (rawQuery.includes('play') ||
        rawQuery.includes('pause') ||
        rawQuery.includes('video') ||
        rawQuery.includes('volume') ||
        rawQuery.includes('audio'))
    ) {
      return 0.25;
    }

    if (
      category === 'primary-action' &&
      (rawQuery.includes('submit') ||
        rawQuery.includes('click') ||
        rawQuery.includes('button') ||
        rawQuery.includes('save') ||
        rawQuery.includes('buy') ||
        rawQuery.includes('cart'))
    ) {
      return 0.15;
    }

    if (
      category === 'form-input' &&
      (rawQuery.includes('input') ||
        rawQuery.includes('enter') ||
        rawQuery.includes('field') ||
        rawQuery.includes('form') ||
        rawQuery.includes('text') ||
        rawQuery.includes('type'))
    ) {
      return 0.15;
    }

    return 0.0;
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 1 && !this.STOP_WORDS.has(t));
  }

  private expandTokens(tokens: string[]): string[] {
    const expanded: string[] = [];
    for (const t of tokens) {
      if (this.SYNONYM_MAP[t]) {
        expanded.push(...this.SYNONYM_MAP[t]);
      }
    }
    return expanded;
  }

  private generateReason(el: ScannedElement, rawQuery: string, score: number): string {
    if (score >= 0.9) {
      return `Exact match for "${el.label}" (${el.category})`;
    }
    if (score >= 0.75) {
      return `Strong match for "${el.label}" matching query intent`;
    }
    if (el.placeholder && rawQuery.includes(el.placeholder.toLowerCase())) {
      return `Matched placeholder text "${el.placeholder}"`;
    }
    return `Relevant ${el.category} element <${el.tagName}>`;
  }
}

export const localMatcherService = new LocalMatcherService();
