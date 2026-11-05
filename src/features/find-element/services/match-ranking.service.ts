/**
 * Sahayak Match Ranking Service
 * Fuses local heuristics and AI provider outputs into a coherent, confidence-ranked
 * match list with tie-breaking, visibility prioritization, and ambiguity detection.
 */

import { ElementMatch } from '../types/find-element.types';

export class MatchRankingService {
  /**
   * Blends local keyword matches and AI predictions into a hybrid ranking.
   */
  public rankHybridMatches(
    localMatches: ElementMatch[],
    aiMatches: ElementMatch[]
  ): {
    rankedMatches: ElementMatch[];
    bestMatch: ElementMatch | null;
    isAmbiguous: boolean;
  } {
    const combinedMap = new Map<number, ElementMatch>();

    // 1. Index local matches
    for (const match of localMatches) {
      combinedMap.set(match.actionId, { ...match, source: 'local' });
    }

    // 2. Blend AI matches
    for (const aiMatch of aiMatches) {
      const existing = combinedMap.get(aiMatch.actionId);

      if (existing) {
        // Hybrid blend: 60% AI confidence + 40% local confidence
        const blendedConfidence = Math.min(
          1.0,
          Math.round((aiMatch.confidence * 0.6 + existing.confidence * 0.4) * 100) / 100
        );

        combinedMap.set(aiMatch.actionId, {
          actionId: aiMatch.actionId,
          element: aiMatch.element,
          confidence: blendedConfidence,
          reason: aiMatch.reason || existing.reason,
          source: 'hybrid',
        });
      } else {
        combinedMap.set(aiMatch.actionId, { ...aiMatch, source: 'ai' });
      }
    }

    const ranked = Array.from(combinedMap.values());

    // 3. Prioritize enabled and visible controls
    ranked.sort((a, b) => {
      // Primary: confidence score
      if (Math.abs(b.confidence - a.confidence) > 0.05) {
        return b.confidence - a.confidence;
      }

      // Tie breaker 1: enabled elements over disabled elements
      if (a.element.isEnabled !== b.element.isEnabled) {
        return a.element.isEnabled ? -1 : 1;
      }

      // Tie breaker 2: visible elements
      if (a.element.isVisible !== b.element.isVisible) {
        return a.element.isVisible ? -1 : 1;
      }

      return b.confidence - a.confidence;
    });

    const bestMatch = ranked.length > 0 && ranked[0].confidence >= 0.45 ? ranked[0] : null;

    // 4. Ambiguity detection: if top 2 matches have very close confidence (within 0.05) and both >= 0.8
    const isAmbiguous =
      ranked.length >= 2 &&
      ranked[0].confidence >= 0.8 &&
      ranked[1].confidence >= 0.8 &&
      Math.abs(ranked[0].confidence - ranked[1].confidence) < 0.06;

    return {
      rankedMatches: ranked,
      bestMatch,
      isAmbiguous,
    };
  }
}

export const matchRankingService = new MatchRankingService();
