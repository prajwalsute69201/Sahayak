/**
 * Sahayak useMemorySettings Hook
 * State management for memory personalization and suggestion toggles.
 */

import { useState, useEffect, useCallback } from 'react';
import { MemorySettings } from '../types/memory.types';
import { memoryService } from '../services/memory.service';
import { DEFAULT_MEMORY_SETTINGS } from '../services/memory-storage.service';

export function useMemorySettings() {
  const [settings, setSettings] = useState<MemorySettings>({ ...DEFAULT_MEMORY_SETTINGS });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await memoryService.getSettings();
      setSettings(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load memory settings';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(async (updates: Partial<MemorySettings>) => {
    try {
      setError(null);
      const updated = await memoryService.updateSettings(updates);
      setSettings(updated);
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update memory settings';
      setError(msg);
      throw err;
    }
  }, []);

  return {
    settings,
    isLoading,
    error,
    loadSettings,
    updateSettings,
  };
}
