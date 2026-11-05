/**
 * Sahayak useSkillHistory Hook
 * Manages loading, filtering, and clearing skill execution history.
 */

import { useState, useEffect, useCallback } from 'react';
import { SkillExecutionRecord } from '../types/skill.types';
import { skillService } from '../services/skill.service';

export function useSkillHistory(skillId?: string) {
  const [history, setHistory] = useState<SkillExecutionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await skillService.getHistory(skillId);
      setHistory(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load execution history';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const clearHistory = useCallback(async () => {
    try {
      await skillService.clearHistory();
      setHistory([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear execution history';
      setError(msg);
      throw err;
    }
  }, []);

  return {
    history,
    isLoading,
    error,
    loadHistory,
    clearHistory,
  };
}
