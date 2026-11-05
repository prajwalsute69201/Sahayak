/**
 * Sahayak Agent React Hook
 * Manages agent planning, HITL approval state, dry-run mode, execution, and progress persistence.
 */

import { useState, useCallback, useEffect } from 'react';
import { AgentSession, AgentAction, ActionExecutionResult } from '../types/agent.types';
import { agentOrchestratorService } from '../services/agent-orchestrator.service';
import { agentSessionService } from '../services/agent-session.service';
import { agentPersistenceService } from '../services/agent-persistence.service';
import { scannerClientService, ScannedElement } from '@/features/element-scanner';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useDryRun } from './useDryRun';

export interface UseAgentReturn {
  session: AgentSession;
  instruction: string;
  isPlanning: boolean;
  isExecuting: boolean;
  proposedAction: AgentAction | null;
  lastResult: ActionExecutionResult | null;
  error: string | null;
  strongConfirmationAccepted: boolean;
  isDryRun: boolean;
  isRestored: boolean;
  isInterrupted: boolean;
  setInstruction: (text: string) => void;
  setStrongConfirmationAccepted: (accepted: boolean) => void;
  setDryRun: (enabled: boolean) => Promise<void>;
  toggleDryRun: () => Promise<void>;
  planAction: (instructionOverride?: string) => Promise<void>;
  approveAndExecute: () => Promise<void>;
  rejectAction: () => void;
  cancelSession: () => void;
  resetSession: () => void;
  clearError: () => void;
}

export const useAgent = (externalCandidates: ScannedElement[] = []): UseAgentReturn => {
  const [currentTabId, setCurrentTabId] = useState<number>(1);
  const [instruction, setInstruction] = useState<string>('');
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [strongConfirmationAccepted, setStrongConfirmationAccepted] = useState<boolean>(false);

  const { isDryRun, setDryRun, toggleDryRun } = useDryRun(currentTabId);

  const [session, setSession] = useState<AgentSession>(() =>
    agentSessionService.getOrCreateSession(1)
  );

  const { settings } = useSettingsStore();

  // Sync active Chrome tabId and restore persisted progress
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id) {
          setCurrentTabId(tab.id);
          agentOrchestratorService.restoreSession(tab.id, tab.url).then((restored) => {
            setSession({ ...restored });
            if (restored.userInstruction && restored.state !== 'idle') {
              setInstruction(restored.userInstruction);
            }
          });
        }
      });
    }
  }, []);

  const planAction = useCallback(
    async (instructionOverride?: string) => {
      const text = typeof instructionOverride === 'string' ? instructionOverride : instruction;
      const trimmed = text.trim();

      if (!trimmed) return;

      setIsPlanning(true);
      setError(null);
      setStrongConfirmationAccepted(false);

      try {
        // Step 1: Ensure candidates exist
        let candidates = externalCandidates;
        if (candidates.length === 0) {
          const scan = await scannerClientService.scanActiveTab(true);
          candidates = scan.elements;
        }

        // Step 2: Get active tab metadata
        let pageTitle = document.title;
        let pageUrl = window.location.href;

        if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            pageTitle = tab.title || pageTitle;
            pageUrl = tab.url || pageUrl;
          }
        }

        // Step 3: Run orchestrator planning
        const action = await agentOrchestratorService.planAction(
          {
            instruction: trimmed,
            pageTitle,
            pageUrl,
            candidates,
            previousActionResults: session.actionResults,
          },
          currentTabId,
          settings.language
        );

        setSession({
          ...agentSessionService.getOrCreateSession(currentTabId),
          proposedAction: action,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setSession(agentSessionService.getOrCreateSession(currentTabId));
      } finally {
        setIsPlanning(false);
      }
    },
    [instruction, externalCandidates, currentTabId, session.actionResults, settings.language]
  );

  const approveAndExecute = useCallback(async () => {
    const proposed = session.proposedAction;
    if (!proposed) return;

    if (!isDryRun && proposed.requiresStrongConfirmation && !strongConfirmationAccepted) {
      setError('Please check the confirmation box for this high-risk action before approving.');
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      await agentOrchestratorService.approveAndExecute(currentTabId, proposed.id);
      setSession({ ...agentSessionService.getOrCreateSession(currentTabId) });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setSession(agentSessionService.getOrCreateSession(currentTabId));
    } finally {
      setIsExecuting(false);
    }
  }, [session.proposedAction, isDryRun, strongConfirmationAccepted, currentTabId]);

  const rejectAction = useCallback(() => {
    if (!session.proposedAction) return;
    agentOrchestratorService.rejectAction(currentTabId, session.proposedAction.id);
    setSession(agentSessionService.getOrCreateSession(currentTabId));
    setStrongConfirmationAccepted(false);
  }, [session.proposedAction, currentTabId]);

  const cancelSession = useCallback(() => {
    const updated = agentOrchestratorService.cancelSession(currentTabId);
    setSession({ ...updated });
    setInstruction('');
    setStrongConfirmationAccepted(false);
    setError(null);
  }, [currentTabId]);

  const resetSession = useCallback(() => {
    const updated = agentSessionService.resetSession(currentTabId);
    agentPersistenceService.deleteSession(currentTabId).catch(() => {});
    setSession({ ...updated });
    setInstruction('');
    setStrongConfirmationAccepted(false);
    setError(null);
  }, [currentTabId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const proposedAction = session.proposedAction;
  const lastResult =
    session.actionResults.length > 0
      ? session.actionResults[session.actionResults.length - 1]
      : null;

  return {
    session,
    instruction,
    isPlanning,
    isExecuting,
    proposedAction,
    lastResult,
    error,
    strongConfirmationAccepted,
    isDryRun,
    isRestored: Boolean(session.isRestored),
    isInterrupted: Boolean(session.isInterrupted),
    setInstruction,
    setStrongConfirmationAccepted,
    setDryRun,
    toggleDryRun,
    planAction,
    approveAndExecute,
    rejectAction,
    cancelSession,
    resetSession,
    clearError,
  };
};
