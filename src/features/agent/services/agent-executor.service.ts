/**
 * Sahayak Agent Executor Service
 * Enforces strict single-use approval verification, dry-run simulation guards,
 * and safe dispatching of actions to the active tab.
 */

import {
  AgentAction,
  ActionExecutionResult,
  ExecuteAgentActionMessage,
} from '../types/agent.types';
import { agentContentExecutor } from '../content/agent-content-executor';
import { executionGuardService } from '@/features/safety/services/execution-guard.service';

export class AgentExecutorService {
  /** Registry of consumed approval tokens to prevent duplicate executions */
  private consumedTokens = new Set<string>();

  /** Central dry-run mode flag enforcing simulation at the execution level */
  private isDryRun = false;

  /**
   * Updates central dry-run mode.
   */
  public setDryRun(enabled: boolean): void {
    this.isDryRun = enabled;
  }

  /**
   * Returns current central dry-run mode.
   */
  public isDryRunEnabled(): boolean {
    return this.isDryRun;
  }

  /**
   * Executes a validated and explicitly approved agent action, or simulates it if in Dry-Run Mode.
   */
  public async executeAction(action: AgentAction, tabId?: number): Promise<ActionExecutionResult> {
    const startTime = performance.now();

    // Verification 1: Dry-Run Mode Gate (enforced at executor level)
    const isDryRunActive =
      this.isDryRun || action.isDryRun || action.approvalStatus === 'preview_only';
    if (isDryRunActive) {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'preview_only',
        isDryRun: true,
        message: `[Dry-Run Preview] Action simulated successfully: "${action.title}". No browser events were dispatched.`,
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
        targetAvailable: true,
      };
    }

    // Verification 2: Explicit approval check (Slice 12 requirement: must return 'cancelled')
    if (action.approvalStatus !== 'approved' || !action.approvalToken) {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'cancelled',
        message: 'Action blocked: Explicit user approval was not granted.',
        dispatchedAt: Date.now(),
        durationMs: 0,
      };
    }

    // Verification 3: Single-use approval token check (replay prevention)
    if (this.consumedTokens.has(action.approvalToken)) {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'failed',
        message:
          'Action blocked: This approval token has already been consumed. Re-approval required.',
        dispatchedAt: Date.now(),
        durationMs: 0,
      };
    }

    // Verification 4: Deterministic Policy & Safety Execution Guard (Slice 16)
    const guardResult = executionGuardService.verifyExecutionGuard({
      action,
      isDryRun: isDryRunActive,
      strongConfirmationAccepted: action.requiresStrongConfirmation,
    });

    if (!guardResult.canExecute && !isDryRunActive) {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'failed',
        message: guardResult.reason || 'Action blocked by safety policy execution guard.',
        dispatchedAt: Date.now(),
        durationMs: 0,
      };
    }

    // Mark token as consumed and record executed to prevent replays
    this.consumedTokens.add(action.approvalToken);
    executionGuardService.recordExecuted(action.id);

    // If running in test or headless environment without Chrome tabs API
    if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) {
      return agentContentExecutor.execute(action, action.approvalToken);
    }

    // Determine target tab
    let targetTabId = tabId;
    if (!targetTabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      targetTabId = tab?.id;
    }

    if (!targetTabId) {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'failed',
        message: 'No active browser tab found to execute action.',
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    const message: ExecuteAgentActionMessage = {
      type: 'EXECUTE_AGENT_ACTION',
      action,
      approvalToken: action.approvalToken,
    };

    try {
      const response = (await chrome.tabs.sendMessage(
        targetTabId!,
        message
      )) as ActionExecutionResult;
      return (
        response || {
          actionId: action.id,
          actionType: action.type,
          status: 'success',
          message: 'Action dispatched successfully.',
          dispatchedAt: Date.now(),
          durationMs: Math.round(performance.now() - startTime),
        }
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'failed',
        message: `Content script dispatch failed: ${errMsg}`,
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
        error: errMsg,
      };
    }
  }

  /**
   * Generates a unique cryptographically safe single-use approval token.
   */
  public generateApprovalToken(): string {
    return crypto.randomUUID();
  }

  /**
   * Alias for executeAction.
   */
  public executeApprovedAction = this.executeAction.bind(this);

  /**
   * Clears consumed approval tokens (e.g. on session reset).
   */
  public clearTokens(): void {
    this.consumedTokens.clear();
  }
}

export const agentExecutorService = new AgentExecutorService();
