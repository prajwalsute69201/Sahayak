/**
 * Sahayak useDryRun Hook
 * Provides reactive Dry-Run mode state synchronized with storage and executor.
 */

import { useState, useEffect, useCallback } from 'react';
import { agentOrchestratorService } from '../services/agent-orchestrator.service';
import { agentPersistenceService } from '../services/agent-persistence.service';

export interface UseDryRunReturn {
  isDryRun: boolean;
  setDryRun: (enabled: boolean) => Promise<void>;
  toggleDryRun: () => Promise<void>;
}

export const useDryRun = (tabId?: number): UseDryRunReturn => {
  const [isDryRun, setIsDryRunState] = useState<boolean>(() => agentOrchestratorService.isDryRun());

  useEffect(() => {
    agentPersistenceService.getDryRunMode().then((enabled) => {
      setIsDryRunState(enabled);
      agentOrchestratorService.setDryRun(enabled, tabId).catch(() => {});
    });
  }, [tabId]);

  const setDryRun = useCallback(
    async (enabled: boolean) => {
      setIsDryRunState(enabled);
      await agentOrchestratorService.setDryRun(enabled, tabId);
    },
    [tabId]
  );

  const toggleDryRun = useCallback(async () => {
    const next = !isDryRun;
    setIsDryRunState(next);
    await agentOrchestratorService.setDryRun(next, tabId);
  }, [isDryRun, tabId]);

  return {
    isDryRun,
    setDryRun,
    toggleDryRun,
  };
};
