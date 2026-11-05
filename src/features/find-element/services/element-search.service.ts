/**
 * Sahayak Element Search Orchestrator Service
 * Coordinates natural-language queries between local keyword/semantic heuristics
 * and LLM providers, returning validated, ranked match results with latency telemetry.
 */

import { ScannedElement } from '@/features/element-scanner';
import { localMatcherService } from './local-matcher.service';
import { aiMatcherService } from './ai-matcher.service';
import { matchRankingService } from './match-ranking.service';
import { ElementMatchResult, ElementMatch } from '../types/find-element.types';
import { LanguagePreference } from '@/types/settings.types';

export interface SearchOptions {
  language?: LanguagePreference;
  preferAI?: boolean;
}

export class ElementSearchService {
  /**
   * Executes a hybrid natural-language search across current scanned DOM elements.
   */
  public async search(
    query: string,
    candidates: ScannedElement[],
    options: SearchOptions = {}
  ): Promise<ElementMatchResult> {
    const startTime = performance.now();
    const trimmedQuery = query.trim();

    if (!trimmedQuery || candidates.length === 0) {
      return {
        query: trimmedQuery,
        matches: [],
        bestMatch: null,
        clarificationNeeded: false,
        notFound: true,
        durationMs: Math.round(performance.now() - startTime),
        matchSource: 'local',
      };
    }

    // Step 1: Run fast local matcher
    const localMatches = localMatcherService.match(trimmedQuery, candidates);

    // If local match is exceptionally high confidence (e.g. exact match >= 0.94) and AI is not explicitly forced,
    // we can return instantly with near-zero latency
    if (!options.preferAI && localMatches.length > 0 && localMatches[0].confidence >= 0.94) {
      return {
        query: trimmedQuery,
        matches: localMatches,
        bestMatch: localMatches[0],
        clarificationNeeded: false,
        notFound: false,
        durationMs: Math.round(performance.now() - startTime),
        matchSource: 'local',
      };
    }

    // Step 2: Invoke AI matcher for natural language understanding
    let aiMatches: ElementMatch[] = [];
    let aiClarificationNeeded = false;
    let aiClarificationQuestion: string | undefined;
    let aiNotFound = false;
    let matchSource: 'local' | 'ai' | 'hybrid' = 'local';

    try {
      const aiResult = await aiMatcherService.matchWithAI({
        userQuery: trimmedQuery,
        candidates,
        language: options.language,
      });

      if (aiResult.success) {
        aiMatches = aiResult.matches;
        aiClarificationNeeded = aiResult.clarificationNeeded;
        aiClarificationQuestion = aiResult.clarificationQuestion;
        aiNotFound = aiResult.notFound;
        matchSource = localMatches.length > 0 ? 'hybrid' : 'ai';
      }
    } catch {
      // Graceful fallback to local matches on AI failure
      matchSource = 'local';
    }

    // Step 3: Hybrid ranking fusion
    const { rankedMatches, bestMatch, isAmbiguous } = matchRankingService.rankHybridMatches(
      localMatches,
      aiMatches
    );

    const clarificationNeeded = aiClarificationNeeded || (isAmbiguous && rankedMatches.length > 1);
    const clarificationQuestion =
      aiClarificationQuestion ||
      (clarificationNeeded
        ? `I found multiple matching controls (such as "${rankedMatches[0]?.element.label}" and "${rankedMatches[1]?.element.label}"). Which one would you like?`
        : undefined);

    const notFound = (aiNotFound && rankedMatches.length === 0) || rankedMatches.length === 0;

    return {
      query: trimmedQuery,
      matches: rankedMatches,
      bestMatch,
      clarificationNeeded,
      clarificationQuestion,
      notFound,
      durationMs: Math.round(performance.now() - startTime),
      matchSource,
    };
  }
}

export const elementSearchService = new ElementSearchService();
