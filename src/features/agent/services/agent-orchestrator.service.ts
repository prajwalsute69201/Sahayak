/**
 * Sahayak Agent Orchestrator Service
 * Coordinates the single-step HITL agent loop: Understand → Plan → Propose → Request Approval → Execute → Verify.
 * Now extended with Slice 13 Progress Persistence, Dry-Run Mode & Structured Action Logging.
 */

import {
  AgentAction,
  ActionExecutionResult,
  AgentPlannerContext,
  AgentSession,
} from '../types/agent.types';
import { agentPlannerService } from './agent-planner.service';
import { agentExecutorService } from './agent-executor.service';
import { agentVerificationService } from './agent-verification.service';
import { agentSessionService } from './agent-session.service';
import { agentPersistenceService } from './agent-persistence.service';
import { agentActionLogService } from './agent-action-log.service';
import { scannerClientService, ScannedElement } from '@/features/element-scanner';
import { LanguagePreference } from '@/types/settings.types';
import { safetyPolicyService } from '@/features/safety/services/safety-policy.service';
import { executionGuardService } from '@/features/safety/services/execution-guard.service';

export class AgentOrchestratorService {
  private isDryRunMode = false;
  private isInitialized = false;

  constructor() {
    this.initDryRun().catch(() => {});
  }

  private async initDryRun(): Promise<void> {
    if (this.isInitialized) return;
    this.isDryRunMode = await agentPersistenceService.getDryRunMode();
    agentExecutorService.setDryRun(this.isDryRunMode);
    this.isInitialized = true;
  }

  /**
   * Sets dry-run mode across the orchestrator, executor, and storage.
   */
  public async setDryRun(enabled: boolean, tabId?: number): Promise<void> {
    this.isDryRunMode = enabled;
    agentExecutorService.setDryRun(enabled);
    await agentPersistenceService.setDryRunMode(enabled);
    if (tabId) {
      agentSessionService.setDryRun(tabId, enabled);
      const session = agentSessionService.getSession(tabId);
      if (session) {
        await agentPersistenceService.saveSession(session);
      }
    }
  }

  /**
   * Returns current dry-run mode.
   */
  public isDryRun(): boolean {
    return this.isDryRunMode;
  }

  /**
   * Restores persisted progress for an active tab.
   * Restores information and action history, never execution authority.
   */
  public async restoreSession(tabId: number, currentUrl?: string): Promise<AgentSession> {
    await this.initDryRun();
    const persisted = await agentPersistenceService.loadSession(tabId);

    if (persisted) {
      // Re-validate if URL changed
      if (currentUrl && persisted.pageUrl && persisted.pageUrl !== currentUrl) {
        persisted.pageUrl = currentUrl;
      }

      persisted.isDryRun = this.isDryRunMode;
      const restored = agentSessionService.restoreSession(persisted);

      if (restored.isInterrupted) {
        await agentActionLogService.logEvent({
          sessionId: restored.sessionId,
          tabId,
          eventType: 'action_interrupted',
          description: `Previous session interrupted during browser or extension shutdown.`,
          isDryRun: this.isDryRunMode,
        });
      }

      await agentActionLogService.logEvent({
        sessionId: restored.sessionId,
        tabId,
        eventType: 'session_restored',
        description: `Restored session history (${restored.executedActions.length} previous actions) for tab #${tabId}.`,
        isDryRun: this.isDryRunMode,
        metadata: {
          userInstruction: restored.userInstruction,
          pageUrl: restored.pageUrl,
        },
      });

      return restored;
    }

    return agentSessionService.getOrCreateSession(tabId);
  }

  /**
   * Plans the single next action from user instruction and page context.
   * Supports both context object and positional instruction/candidates.
   */
  public async planAction(
    contextOrInstruction: AgentPlannerContext | string,
    candidatesOrTabId: ScannedElement[] | number = 1,
    languageOrTabId: LanguagePreference | number = 'en'
  ): Promise<AgentAction> {
    await this.initDryRun();

    let context: AgentPlannerContext;
    let tabId = 1;
    let language: LanguagePreference = 'en';

    if (typeof contextOrInstruction === 'string') {
      const candidates = Array.isArray(candidatesOrTabId) ? candidatesOrTabId : [];
      tabId = typeof languageOrTabId === 'number' ? languageOrTabId : 1;
      context = {
        instruction: contextOrInstruction,
        candidates,
        pageTitle: '',
        pageUrl: '',
      };
    } else {
      context = contextOrInstruction;
      tabId = typeof candidatesOrTabId === 'number' ? candidatesOrTabId : 1;
      language = typeof languageOrTabId === 'string' ? languageOrTabId : 'en';
    }

    const session = agentSessionService.getOrCreateSession(tabId);
    session.isDryRun = this.isDryRunMode;
    agentSessionService.setMetadata(tabId, context.pageTitle, context.pageUrl);

    // Prevent concurrent planning/executing
    if (session.state === 'executing') {
      throw new Error('An action is currently executing. Please wait for completion.');
    }

    // Structured logging: instruction received & planning started
    await agentActionLogService.logEvent({
      sessionId: session.sessionId,
      tabId,
      eventType: 'instruction_received',
      description: `User instruction received: "${context.instruction}"`,
      isDryRun: this.isDryRunMode,
      metadata: {
        userInstruction: context.instruction,
        pageTitle: context.pageTitle,
        pageUrl: context.pageUrl,
      },
    });

    await agentActionLogService.logEvent({
      sessionId: session.sessionId,
      tabId,
      eventType: 'planning_started',
      description: `Evaluating ${context.candidates.length} DOM elements for candidate match.`,
      isDryRun: this.isDryRunMode,
    });

    agentSessionService.updateState(tabId, 'planning');

    try {
      const action = await agentPlannerService.planNextAction(context, language);
      action.isDryRun = this.isDryRunMode;

      // Deterministic Safety Policy Evaluation (Slice 16)
      const targetElement =
        'targetActionId' in action && typeof action.targetActionId === 'number'
          ? context.candidates.find((c) => c.actionId === action.targetActionId)
          : undefined;

      const policyDecision = safetyPolicyService.evaluateAction(action, targetElement, {
        url: context.pageUrl,
        title: context.pageTitle,
      });

      // Override AI risk with deterministic calculated risk
      action.risk = policyDecision.risk as 'low' | 'medium' | 'high';
      if (policyDecision.requiredConfirmation === 'enhanced_confirmation') {
        action.requiresStrongConfirmation = true;
      }

      agentSessionService.setProposedAction(tabId, context.instruction, action);

      // Structured logging: action proposed
      await agentActionLogService.logEvent({
        sessionId: session.sessionId,
        actionId: action.id,
        tabId,
        eventType: 'action_proposed',
        description: `Proposed: ${action.title} (${action.type}) [Risk: ${action.risk.toUpperCase()}]`,
        status: action.approvalStatus,
        risk: action.risk,
        actionType: action.type,
        isDryRun: this.isDryRunMode,
        metadata: {
          reason: action.reason,
          expectedResult: action.expectedResult,
          targetActionId: 'targetActionId' in action ? action.targetActionId : undefined,
          targetElementLabel:
            'targetElementLabel' in action ? action.targetElementLabel : undefined,
          targetTagName: 'targetTagName' in action ? action.targetTagName : undefined,
          targetUrl: 'targetUrl' in action ? action.targetUrl : undefined,
          direction: 'direction' in action ? action.direction : undefined,
        },
      });

      // Pre-highlight target element on webpage so user can see what will be clicked/targeted
      if ('targetActionId' in action && typeof action.targetActionId === 'number') {
        scannerClientService.highlightElement(action.targetActionId).catch(() => {});
      }

      // Persist session
      await agentPersistenceService.saveSession(session);

      return action;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      agentSessionService.updateState(tabId, 'failed', msg);
      await agentPersistenceService.saveSession(session);
      throw err;
    }
  }

  /**
   * Approves and executes the proposed action under explicit user consent.
   * If in Dry-Run Mode, safely simulates without browser mutations.
   */
  public async approveAndExecute(
    tabIdOrActionId: number | string,
    actionIdOrTabId?: string | number
  ): Promise<ActionExecutionResult & { verified?: boolean }> {
    await this.initDryRun();

    const tabId =
      typeof tabIdOrActionId === 'number'
        ? tabIdOrActionId
        : typeof actionIdOrTabId === 'number'
          ? actionIdOrTabId
          : 1;

    const actionId =
      typeof tabIdOrActionId === 'string'
        ? tabIdOrActionId
        : typeof actionIdOrTabId === 'string'
          ? actionIdOrTabId
          : '';

    const session = agentSessionService.getOrCreateSession(tabId);
    const proposed = session.proposedAction;

    if (!proposed || proposed.id !== actionId) {
      throw new Error('Action proposal has expired or does not match active session.');
    }

    if (session.state === 'executing') {
      throw new Error('Action is already executing.');
    }

    const isDryRunActive = this.isDryRunMode || session.isDryRun || proposed.isDryRun;

    // Deterministic Policy Pre-check: Blocked actions can NEVER be executed (even if user tries to approve)
    const preCheck = safetyPolicyService.evaluateAction(proposed, undefined, {
      url: session.pageUrl,
    });
    if (preCheck.isBlocked && !isDryRunActive) {
      throw new Error(`Execution Guard Blocked: ${preCheck.reason}`);
    }

    // Dry-Run Mode Execution Flow
    if (isDryRunActive) {
      proposed.approvalStatus = 'preview_only';
      proposed.isDryRun = true;

      const rawResult = await agentExecutorService.executeAction(proposed, tabId);
      const verifiedResult = agentVerificationService.verifyExecution(proposed, rawResult);

      agentSessionService.recordExecution(tabId, proposed, verifiedResult);

      await agentActionLogService.logEvent({
        sessionId: session.sessionId,
        actionId: proposed.id,
        tabId,
        eventType: 'action_previewed',
        description: `Dry-run previewed: "${proposed.title}" (simulated without execution).`,
        status: 'preview_only',
        risk: proposed.risk,
        actionType: proposed.type,
        isDryRun: true,
        metadata: {
          reason: proposed.reason,
          expectedResult: proposed.expectedResult,
          durationMs: rawResult.durationMs,
        },
      });

      await agentPersistenceService.saveSession(session);
      return verifiedResult;
    }

    // Normal Execution Flow
    const approvalToken = crypto.randomUUID();
    proposed.approvalStatus = 'approved';
    proposed.approvalToken = approvalToken;

    // Execution Guard Verification with approval and single-use token in place
    const guardCheck = executionGuardService.verifyExecutionGuard({
      action: proposed,
      session,
      isDryRun: false,
      currentTabUrl: session.pageUrl,
      strongConfirmationAccepted: proposed.requiresStrongConfirmation,
    });

    if (!guardCheck.canExecute) {
      throw new Error(guardCheck.reason || 'Action blocked by deterministic safety policy.');
    }

    await agentActionLogService.logEvent({
      sessionId: session.sessionId,
      actionId: proposed.id,
      tabId,
      eventType: 'approval_granted',
      description: `User approved action #${proposed.id}: "${proposed.title}".`,
      status: 'approved',
      risk: proposed.risk,
      actionType: proposed.type,
      isDryRun: false,
    });

    agentSessionService.updateState(tabId, 'executing');

    await agentActionLogService.logEvent({
      sessionId: session.sessionId,
      actionId: proposed.id,
      tabId,
      eventType: 'execution_started',
      description: `Dispatching action to content script...`,
      status: 'executing' as unknown as ActionExecutionResult['status'],
      actionType: proposed.type,
      isDryRun: false,
    });

    // Dispatch execution
    const rawResult = await agentExecutorService.executeAction(proposed, tabId);

    // Verify outcome
    const verifiedResult = agentVerificationService.verifyExecution(proposed, rawResult);

    // Record result and finalize single-step
    agentSessionService.recordExecution(tabId, proposed, verifiedResult);

    // Structured logging: execution outcome
    let eventType: import('../types/agent-log.types').ActionLogEventType = 'execution_completed';
    if (rawResult.status === 'target_not_found') {
      eventType = 'target_not_found';
    } else if (rawResult.status === 'stale_target') {
      eventType = 'target_stale';
    } else if (rawResult.status === 'failed') {
      eventType = 'execution_failed';
    }

    await agentActionLogService.logEvent({
      sessionId: session.sessionId,
      actionId: proposed.id,
      tabId,
      eventType,
      description: `Execution ${rawResult.status}: ${verifiedResult.diagnosticNote || verifiedResult.message}`,
      status: rawResult.status,
      risk: proposed.risk,
      actionType: proposed.type,
      isDryRun: false,
      error: rawResult.error,
      metadata: {
        durationMs: rawResult.durationMs,
        didUrlChange: verifiedResult.didUrlChange,
        targetUrl: rawResult.urlAfter,
      },
    });

    await agentPersistenceService.saveSession(session);

    return verifiedResult;
  }

  /**
   * Rejects the proposed action without executing it.
   */
  public rejectAction(
    tabIdOrActionId: number | string,
    actionIdOrTabId?: string | number
  ): AgentAction {
    const tabId =
      typeof tabIdOrActionId === 'number'
        ? tabIdOrActionId
        : typeof actionIdOrTabId === 'number'
          ? actionIdOrTabId
          : 1;

    const actionId =
      typeof tabIdOrActionId === 'string'
        ? tabIdOrActionId
        : typeof actionIdOrTabId === 'string'
          ? actionIdOrTabId
          : '';

    const session = agentSessionService.getOrCreateSession(tabId);
    let rejectedAction: AgentAction | null = null;
    if (session.proposedAction && (!actionId || session.proposedAction.id === actionId)) {
      session.proposedAction.approvalStatus = 'rejected';
      rejectedAction = session.proposedAction;

      agentActionLogService
        .logEvent({
          sessionId: session.sessionId,
          actionId: rejectedAction.id,
          tabId,
          eventType: 'action_rejected',
          description: `User rejected proposed action: "${rejectedAction.title}".`,
          status: 'rejected',
          risk: rejectedAction.risk,
          actionType: rejectedAction.type,
          isDryRun: this.isDryRunMode,
        })
        .catch(() => {});
    }

    scannerClientService.clearHighlight().catch(() => {});
    agentSessionService.cancelSession(tabId);
    agentPersistenceService.saveSession(session).catch(() => {});

    return (
      rejectedAction || {
        id: actionId || 'cancelled',
        type: 'scroll_page',
        title: 'Action Rejected',
        description: 'Rejected by user',
        reason: 'User rejected proposal',
        risk: 'low',
        expectedResult: 'No action taken',
        direction: 'down',
        approvalStatus: 'rejected',
        createdAt: Date.now(),
      }
    );
  }

  /**
   * Cancels the entire agent session.
   */
  public cancelSession(tabId: number): AgentSession {
    const session = agentSessionService.getOrCreateSession(tabId);

    agentActionLogService
      .logEvent({
        sessionId: session.sessionId,
        tabId,
        eventType: 'session_cancelled',
        description: `Session cancelled by user.`,
        isDryRun: this.isDryRunMode,
      })
      .catch(() => {});

    scannerClientService.clearHighlight().catch(() => {});
    const cancelled = agentSessionService.cancelSession(tabId);
    agentPersistenceService.saveSession(cancelled).catch(() => {});
    return cancelled;
  }

  /**
   * Retrieves active session for tab.
   */
  public getSession(tabId: number): AgentSession {
    return agentSessionService.getOrCreateSession(tabId);
  }

  /** Alias for getSession */
  public getCurrentSession(tabId: number): AgentSession {
    return this.getSession(tabId);
  }
}

export const agentOrchestratorService = new AgentOrchestratorService();
