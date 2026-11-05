/**
 * Sahayak Element Scanner React Hook
 * Manages element scanning state, badge visibility, category filtering,
 * element search, and bi-directional element highlighting.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScannedElement,
  ScanSummary,
  ElementCategory,
  ElementsUpdatedMessage,
} from '../types/element-scanner.types';
import { scannerClientService } from '../services/scanner-client.service';

export interface UseElementScannerReturn {
  elements: ScannedElement[];
  filteredElements: ScannedElement[];
  summary: ScanSummary | null;
  isScanning: boolean;
  badgesVisible: boolean;
  selectedActionId: number | null;
  error: string | null;
  filterCategory: ElementCategory | 'all';
  searchQuery: string;
  hasScanned: boolean;
  scanPage: () => Promise<void>;
  rescanPage: () => Promise<void>;
  toggleBadges: (forced?: boolean) => Promise<void>;
  highlightElement: (actionId: number) => Promise<void>;
  clearHighlight: () => Promise<void>;
  stopScanner: () => Promise<void>;
  setFilterCategory: (category: ElementCategory | 'all') => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useElementScanner = (): UseElementScannerReturn => {
  const [elements, setElements] = useState<ScannedElement[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [badgesVisible, setBadgesVisible] = useState<boolean>(true);
  const [selectedActionId, setSelectedActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<ElementCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasScanned, setHasScanned] = useState<boolean>(false);

  // Listen for dynamic DOM updates broadcast from content script
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const messageListener = (msg: unknown) => {
      const message = msg as ElementsUpdatedMessage;
      if (message?.type === 'ELEMENTS_UPDATED' && Array.isArray(message.elements)) {
        setElements(message.elements);
        setSummary(message.summary);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const scanPage = useCallback(async () => {
    setIsScanning(true);
    setError(null);

    try {
      const result = await scannerClientService.scanActiveTab(badgesVisible);
      setElements(result.elements);
      setSummary(result.summary);
      setHasScanned(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setElements([]);
      setSummary(null);
    } finally {
      setIsScanning(false);
    }
  }, [badgesVisible]);

  const rescanPage = useCallback(async () => {
    await scanPage();
  }, [scanPage]);

  const toggleBadges = useCallback(
    async (forced?: boolean) => {
      const nextVisible = typeof forced === 'boolean' ? forced : !badgesVisible;
      setBadgesVisible(nextVisible);
      await scannerClientService.toggleBadges(nextVisible);
    },
    [badgesVisible]
  );

  const highlightElement = useCallback(
    async (actionId: number) => {
      if (selectedActionId === actionId) {
        // Deselect if clicked again
        setSelectedActionId(null);
        await scannerClientService.clearHighlight();
        return;
      }

      setSelectedActionId(actionId);
      await scannerClientService.highlightElement(actionId);
    },
    [selectedActionId]
  );

  const clearHighlight = useCallback(async () => {
    setSelectedActionId(null);
    await scannerClientService.clearHighlight();
  }, []);

  const stopScanner = useCallback(async () => {
    await scannerClientService.stopScanner();
    setElements([]);
    setSummary(null);
    setHasScanned(false);
    setSelectedActionId(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Filtered elements computation
  const filteredElements = useMemo(() => {
    return elements.filter((el) => {
      // Category filter
      if (filterCategory !== 'all' && el.category !== filterCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesLabel = el.label.toLowerCase().includes(query);
        const matchesTag = el.tagName.toLowerCase().includes(query);
        const matchesType = el.type?.toLowerCase().includes(query) || false;
        const matchesSelector = el.selector?.toLowerCase().includes(query) || false;
        const matchesId = String(el.actionId) === query;

        return matchesLabel || matchesTag || matchesType || matchesSelector || matchesId;
      }

      return true;
    });
  }, [elements, filterCategory, searchQuery]);

  return {
    elements,
    filteredElements,
    summary,
    isScanning,
    badgesVisible,
    selectedActionId,
    error,
    filterCategory,
    searchQuery,
    hasScanned,
    scanPage,
    rescanPage,
    toggleBadges,
    highlightElement,
    clearHighlight,
    stopScanner,
    setFilterCategory,
    setSearchQuery,
    clearError,
  };
};
