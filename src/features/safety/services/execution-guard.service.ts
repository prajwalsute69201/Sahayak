/**
 * Sahayak Deterministic Execution Guard Service (Slice 16)
 * Pre-execution gatekeeper that independently re-verifies safety policy, target DOM metadata,
 * fresh single-use approval tokens, and dry-run state immediately before browser dispatch.
 * Strictly fails closed if any safety condition cannot be verified.
 */

import { AgentAction, AgentSession } from '@/features/agent/types/agent.types';
import { ScannedElement } from '@/features/element-scanner';
import { ExecutionGuardVerificationResult, SafetyPolicyDecision } from '../types/safety.types';
import { safetyPolicyService } from './safety-policy.service';
import { urlSafetyService } from './url-safety.service';
import { safetyAuditService } from './safety-audit.service';

export interface ExecutionGuardContext {
  action: AgentAction;
  session?: AgentSession | null;
  currentElement?: ScannedElement | null;
  currentTabUrl?: string;
  isDryRun?: boolean;
  strongConfirmationAccepted?: boolean;
}

export class ExecutionGuardService {
  /** Registry of executed action IDs to prevent duplicate execution */
  private executedActionIds = new Set<string>();

  /**
   * Resets execution registry (for testing or session clearing)
   */
  public resetRegistry(): void {
    this.executedActionIds.clear();
  }

  /**
   * Performs exhaustive pre-execution verification immediately before dispatch.
   */
  public verifyExecutionGuard(context: ExecutionGuardContext): ExecutionGuardVerificationResult {
    const {
      action,
      session,
      currentElement,
      isDryRun = false,
      strongConfirmationAccepted,
    } = context;

    // 1. Recalculate Policy Decision Fresh
    const policyDecision: SafetyPolicyDecision = safetyPolicyService.evaluateAction(
      action,
      currentElement || undefined,
      { url: context.currentTabUrl }
    );

    // 2. Gate: Strictly Blocked Operations
    if (policyDecision.isBlocked || policyDecision.decision === 'blocked') {
      const reason = `Execution Guard Blocked: ${policyDecision.reason}`;
      safetyAuditService
        .logEvent('execution_guard_rejected', policyDecision, reason, {
          actionId: action.id,
          rule: policyDecision.applicableRules,
        })
        .catch(() => {});

      return {
        canExecute: false,
        reason,
        decision: policyDecision,
        isDryRun,
      };
    }

    // 3. Gate: Duplicate / Replayed Action Prevention
    if (this.executedActionIds.has(action.id)) {
      const reason = `Execution Guard Blocked: Action #${action.id} has already been executed. Replay is forbidden.`;
      safetyAuditService
        .logEvent('invalid_action_rejected', policyDecision, reason, {
          actionId: action.id,
        })
        .catch(() => {});

      return {
        canExecute: false,
        reason,
        decision: policyDecision,
        isDryRun,
      };
    }

    // 4. Gate: URL Safety for Navigation Actions
    if (action.type === 'navigate_to_url') {
      const urlCheck = urlSafetyService.validateUrl(action.targetUrl);
      if (!urlCheck.isValid) {
        const reason = `Execution Guard Blocked: Target URL rejected - ${urlCheck.reason}`;
        safetyAuditService
          .logEvent('url_validation_failed', policyDecision, reason, {
            targetUrl: action.targetUrl,
          })
          .catch(() => {});

        return {
          canExecute: false,
          reason,
          decision: policyDecision,
          isDryRun,
        };
      }
    }

    // 5. Gate: Target Semantic Mutation Check
    // If target was evaluated earlier, verify current element hasn't mutated into a submit or sensitive control
    if (currentElement) {
      if (currentElement.safetyMetadata?.isSubmitControl) {
        const reason =
          'Execution Guard Blocked: Target element has dynamically mutated into a form submit control.';
        safetyAuditService
          .logEvent('target_metadata_changed', policyDecision, reason, {
            actionId: action.id,
            targetActionId: currentElement.actionId,
          })
          .catch(() => {});

        return {
          canExecute: false,
          reason,
          decision: policyDecision,
          isDryRun,
        };
      }

      if (currentElement.safetyMetadata?.isPasswordOrSensitiveField) {
        const reason =
          'Execution Guard Blocked: Target element is identified as a sensitive password or OTP input.';
        safetyAuditService
          .logEvent('target_metadata_changed', policyDecision, reason, {
            actionId: action.id,
          })
          .catch(() => {});

        return {
          canExecute: false,
          reason,
          decision: policyDecision,
          isDryRun,
        };
      }
    }

    // 6. Gate: Dry-Run Mode (Simulation only, passes guard for simulation)
    if (isDryRun || action.isDryRun || action.approvalStatus === 'preview_only') {
      return {
        canExecute: true,
        decision: policyDecision,
        isDryRun: true,
      };
    }

    // 7. Gate: Enhanced Confirmation Check for High-Risk Actions
    if (policyDecision.requiredConfirmation === 'enhanced_confirmation') {
      if (!strongConfirmationAccepted && !action.requiresStrongConfirmation) {
        // Must have user explicit double acknowledgement
        const reason =
          'Execution Guard Blocked: Enhanced confirmation acknowledgement is required for this high-risk action.';
        safetyAuditService
          .logEvent('execution_guard_rejected', policyDecision, reason, {
            actionId: action.id,
          })
          .catch(() => {});

        return {
          canExecute: false,
          reason,
          decision: policyDecision,
          isDryRun: false,
        };
      }
    }

    // 8. Gate: Explicit Approval & Token Presence
    if (action.approvalStatus !== 'approved' || !action.approvalToken) {
      const reason =
        'Execution Guard Blocked: Action lacks explicit user approval or approval token.';
      safetyAuditService
        .logEvent('stale_approval_rejected', policyDecision, reason, {
          actionId: action.id,
        })
        .catch(() => {});

      return {
        canExecute: false,
        reason,
        decision: policyDecision,
        isDryRun: false,
      };
    }

    // 9. Gate: Session Integrity Verification
    if (session && session.proposedAction && session.proposedAction.id !== action.id) {
      const reason = 'Execution Guard Blocked: Action does not match the active session proposal.';
      safetyAuditService
        .logEvent('invalid_action_rejected', policyDecision, reason, {
          actionId: action.id,
          sessionProposedId: session.proposedAction.id,
        })
        .catch(() => {});

      return {
        canExecute: false,
        reason,
        decision: policyDecision,
        isDryRun: false,
      };
    }

    return {
      canExecute: true,
      decision: policyDecision,
      isDryRun: false,
    };
  }

  /**
   * Marks an action as executed to prevent duplicate replays.
   */
  public recordExecuted(actionId: string): void {
    this.executedActionIds.add(actionId);
  }
}

export const executionGuardService = new ExecutionGuardService();
