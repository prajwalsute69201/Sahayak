/**
 * Sahayak Match Validation Service
 * Validates raw AI and local matching outputs against current DOM scanner
 * candidates, rejects fabricated or unknown element IDs, and enforces schema integrity.
 */

import { ScannedElement } from '@/features/element-scanner';
import { RawAIMatchResponse, ElementMatch } from '../types/find-element.types';

export class MatchValidationService {
  /**
   * Validates and sanitizes a raw AI response payload against actual current candidates.
   */
  public validateAndSanitizeAIMatches(
    raw: unknown,
    candidates: ScannedElement[]
  ): {
    validMatches: ElementMatch[];
    clarificationNeeded: boolean;
    clarificationQuestion?: string;
    notFound: boolean;
  } {
    const candidateMap = new Map<number, ScannedElement>();
    for (const c of candidates) {
      candidateMap.set(c.actionId, c);
    }

    if (!raw || typeof raw !== 'object') {
      return {
        validMatches: [],
        clarificationNeeded: false,
        notFound: true,
      };
    }

    const payload = raw as Partial<RawAIMatchResponse>;
    const rawMatches = Array.isArray(payload.matches) ? payload.matches : [];
    const validMatches: ElementMatch[] = [];

    for (const item of rawMatches) {
      if (!item || typeof item !== 'object') continue;

      const rawId = Number(item.actionId);
      if (isNaN(rawId) || !candidateMap.has(rawId)) {
        // Unknown or hallucinated ID - reject!
        continue;
      }

      const element = candidateMap.get(rawId)!;
      const rawConfidence = Number(item.confidence);
      const confidence = isNaN(rawConfidence) ? 0.7 : Math.max(0.0, Math.min(1.0, rawConfidence));

      const reason =
        typeof item.reason === 'string' && item.reason.trim().length > 0
          ? item.reason.trim()
          : `Matched ${element.category} element <${element.tagName}>`;

      validMatches.push({
        actionId: rawId,
        element,
        confidence,
        reason,
        source: 'ai',
      });
    }

    // Sort descending by confidence
    validMatches.sort((a, b) => b.confidence - a.confidence);

    const notFound = Boolean(payload.notFound) || validMatches.length === 0;
    const clarificationNeeded = Boolean(payload.clarificationNeeded);
    const clarificationQuestion =
      typeof payload.clarificationQuestion === 'string' &&
      payload.clarificationQuestion.trim().length > 0
        ? payload.clarificationQuestion.trim()
        : undefined;

    return {
      validMatches,
      clarificationNeeded,
      clarificationQuestion,
      notFound,
    };
  }

  /**
   * Extracts JSON from potentially markdown-fenced or decorated LLM text output.
   */
  public extractJSONFromText(text: string): unknown {
    if (!text || typeof text !== 'string') return null;

    let clean = text.trim();

    // Remove markdown code fences ```json ... ``` or ``` ... ```
    if (clean.includes('```')) {
      const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (match && match[1]) {
        clean = match[1].trim();
      }
    }

    // Try direct parse
    try {
      return JSON.parse(clean);
    } catch {
      // Find outermost curly braces { ... }
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}

export const matchValidationService = new MatchValidationService();
