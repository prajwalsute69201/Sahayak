/**
 * Sahayak "Find It For Me" React Hook
 * Manages query execution, candidate retrieval, result navigation,
 * Shadow DOM highlighting, and stale element recovery.
 */

import { useState, useCallback, useEffect } from 'react';
import { ElementMatchResult, ElementMatch } from '../types/find-element.types';
import { elementSearchService } from '../services/element-search.service';
import { scannerClientService, ScannedElement } from '@/features/element-scanner';
import { useSettingsStore } from '@/store/useSettingsStore';

export interface UseFindElementReturn {
  query: string;
  isSearching: boolean;
  result: ElementMatchResult | null;
  activeMatchIndex: number;
  activeMatch: ElementMatch | null;
  highlightedActionId: number | null;
  error: string | null;
  isStale: boolean;
  setQuery: (q: string) => void;
  search: (queryOverride?: string) => Promise<void>;
  selectMatchIndex: (index: number) => Promise<void>;
  nextMatch: () => Promise<void>;
  prevMatch: () => Promise<void>;
  clearSearch: () => Promise<void>;
  rescanAndRetry: () => Promise<void>;
  clearError: () => void;
}

export const useFindElement = (externalCandidates: ScannedElement[] = []): UseFindElementReturn => {
  const [query, setQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [result, setResult] = useState<ElementMatchResult | null>(null);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
  const [highlightedActionId, setHighlightedActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  const { settings } = useSettingsStore();

  const activeMatch =
    result && result.matches.length > 0 && activeMatchIndex < result.matches.length
      ? result.matches[activeMatchIndex]
      : null;

  const selectMatchIndex = useCallback(
    async (index: number) => {
      if (!result || result.matches.length === 0) return;

      const safeIndex = Math.max(0, Math.min(result.matches.length - 1, index));
      setActiveMatchIndex(safeIndex);
      const targetMatch = result.matches[safeIndex];

      if (targetMatch) {
        setHighlightedActionId(targetMatch.actionId);
        const success = await scannerClientService.highlightElement(targetMatch.actionId);

        if (!success) {
          setIsStale(true);
        } else {
          setIsStale(false);
        }
      }
    },
    [result]
  );

  const search = useCallback(
    async (queryOverride?: string) => {
      const q = typeof queryOverride === 'string' ? queryOverride : query;
      const targetQuery = q.trim();

      if (!targetQuery) return;

      setIsSearching(true);
      setError(null);
      setIsStale(false);

      try {
        // Step 1: Ensure we have scanned candidates from active tab
        let candidates = externalCandidates;
        if (candidates.length === 0) {
          const scanRes = await scannerClientService.scanActiveTab(true);
          candidates = scanRes.elements;
        }

        if (candidates.length === 0) {
          setError('No interactive elements detected on this webpage.');
          setResult(null);
          return;
        }

        // Step 2: Run hybrid search
        const searchResult = await elementSearchService.search(targetQuery, candidates, {
          language: settings.language,
        });

        setResult(searchResult);
        setActiveMatchIndex(0);

        // Step 3: Automatically highlight best match if found
        if (searchResult.bestMatch) {
          setHighlightedActionId(searchResult.bestMatch.actionId);
          const success = await scannerClientService.highlightElement(
            searchResult.bestMatch.actionId
          );
          if (!success) setIsStale(true);
        } else {
          setHighlightedActionId(null);
          await scannerClientService.clearHighlight();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setResult(null);
      } finally {
        setIsSearching(false);
      }
    },
    [query, externalCandidates, settings.language]
  );

  const nextMatch = useCallback(async () => {
    if (!result || result.matches.length <= 1) return;
    const nextIdx = (activeMatchIndex + 1) % result.matches.length;
    await selectMatchIndex(nextIdx);
  }, [result, activeMatchIndex, selectMatchIndex]);

  const prevMatch = useCallback(async () => {
    if (!result || result.matches.length <= 1) return;
    const prevIdx = (activeMatchIndex - 1 + result.matches.length) % result.matches.length;
    await selectMatchIndex(prevIdx);
  }, [result, activeMatchIndex, selectMatchIndex]);

  const clearSearch = useCallback(async () => {
    setQuery('');
    setResult(null);
    setActiveMatchIndex(0);
    setHighlightedActionId(null);
    setError(null);
    setIsStale(false);
    await scannerClientService.clearHighlight();
  }, []);

  const rescanAndRetry = useCallback(async () => {
    setIsStale(false);
    await search();
  }, [search]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup highlights on unmount
  useEffect(() => {
    return () => {
      scannerClientService.clearHighlight().catch(() => {});
    };
  }, []);

  return {
    query,
    isSearching,
    result,
    activeMatchIndex,
    activeMatch,
    highlightedActionId,
    error,
    isStale,
    setQuery,
    search,
    selectMatchIndex,
    nextMatch,
    prevMatch,
    clearSearch,
    rescanAndRetry,
    clearError,
  };
};
