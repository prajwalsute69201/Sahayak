/**
 * Sahayak useMemory Hook
 * State management for local profile memories, filters, and operations.
 */

import { useState, useEffect, useCallback } from 'react';
import { MemoryFilter, MemoryRecord, MemoryStorageStats } from '../types/memory.types';
import { memoryService } from '../services/memory.service';

export function useMemory(initialFilter?: MemoryFilter) {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [filter, setFilterState] = useState<MemoryFilter>(initialFilter || { category: 'all' });
  const [stats, setStats] = useState<MemoryStorageStats>({
    count: 0,
    maxCount: 200,
    estimatedSizeBytes: 0,
    percentageUsed: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await memoryService.getAllMemories(filter);
      const currentStats = await memoryService.getStorageStats();
      setMemories(data);
      setStats(currentStats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load memories';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const setFilter = useCallback((newFilter: Partial<MemoryFilter>) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }));
  }, []);

  const createMemory = useCallback(
    async (record: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        setError(null);
        const created = await memoryService.createMemory(record);
        await loadMemories();
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create memory';
        setError(msg);
        throw err;
      }
    },
    [loadMemories]
  );

  const updateMemory = useCallback(
    async (id: string, updates: Partial<Omit<MemoryRecord, 'id' | 'createdAt'>>) => {
      try {
        setError(null);
        const updated = await memoryService.updateMemory(id, updates);
        await loadMemories();
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update memory';
        setError(msg);
        throw err;
      }
    },
    [loadMemories]
  );

  const deleteMemory = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const result = await memoryService.deleteMemory(id);
        await loadMemories();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete memory';
        setError(msg);
        throw err;
      }
    },
    [loadMemories]
  );

  const clearAll = useCallback(async () => {
    try {
      setError(null);
      await memoryService.clearAll();
      await loadMemories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear memories';
      setError(msg);
      throw err;
    }
  }, [loadMemories]);

  const exportData = useCallback(async () => {
    return await memoryService.exportMemoriesJson();
  }, []);

  const importData = useCallback(
    async (jsonString: string) => {
      const result = await memoryService.importMemoriesJson(jsonString);
      await loadMemories();
      return result;
    },
    [loadMemories]
  );

  return {
    memories,
    filter,
    stats,
    isLoading,
    error,
    loadMemories,
    setFilter,
    createMemory,
    updateMemory,
    deleteMemory,
    clearAll,
    exportData,
    importData,
  };
}
