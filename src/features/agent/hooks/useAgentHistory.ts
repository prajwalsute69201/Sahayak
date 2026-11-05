/**
 * Sahayak useAgentHistory Hook
 * Fetches, filters, searches, and manages structured action logs.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ActionLogEntry, ActionLogFilter } from '../types/agent-log.types';
import { agentActionLogService } from '../services/agent-action-log.service';

export interface UseAgentHistoryReturn {
  logs: ActionLogEntry[];
  filteredLogs: ActionLogEntry[];
  filter: ActionLogFilter;
  searchQuery: string;
  isLoading: boolean;
  totalCount: number;
  setFilter: (filter: ActionLogFilter) => void;
  setSearchQuery: (query: string) => void;
  refreshLogs: () => Promise<void>;
  clearLogs: (tabIdOnly?: boolean) => Promise<void>;
}

export const useAgentHistory = (currentTabId?: number): UseAgentHistoryReturn => {
  const [logs, setLogs] = useState<ActionLogEntry[]>([]);
  const [filter, setFilter] = useState<ActionLogFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await agentActionLogService.getLogs(filter);
      setLogs(items);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  const clearLogs = useCallback(
    async (tabIdOnly = false) => {
      await agentActionLogService.clearLogs(tabIdOnly ? currentTabId : undefined);
      await refreshLogs();
    },
    [currentTabId, refreshLogs]
  );

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) {
      return logs;
    }

    const q = searchQuery.toLowerCase().trim();
    return logs.filter((item) => {
      return (
        item.description.toLowerCase().includes(q) ||
        item.eventType.toLowerCase().includes(q) ||
        (item.metadata?.targetElementLabel &&
          item.metadata.targetElementLabel.toLowerCase().includes(q)) ||
        (item.metadata?.userInstruction &&
          item.metadata.userInstruction.toLowerCase().includes(q)) ||
        (item.actionType && item.actionType.toLowerCase().includes(q)) ||
        (item.error && item.error.toLowerCase().includes(q))
      );
    });
  }, [logs, searchQuery]);

  return {
    logs,
    filteredLogs,
    filter,
    searchQuery,
    isLoading,
    totalCount: logs.length,
    setFilter,
    setSearchQuery,
    refreshLogs,
    clearLogs,
  };
};
