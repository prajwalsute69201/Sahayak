/**
 * Sahayak Deterministic Safety Rails & Consequential Gating Types (Slice 16)
 * Strongly typed definitions for action risk classification, safety policies,
 * deterministic execution guards, and security audit events.
 */

import { AgentActionType } from '@/features/agent/types/agent.types';

export type SafetyRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type PolicyDecisionStatus =
  'allowed' | 'approval_required' | 'enhanced_confirmation_required' | 'blocked';

export type ConfirmationLevel = 'none' | 'standard_approval' | 'enhanced_confirmation';

export type BlockedActionCategory =
  | 'form_submission'
  | 'payments_and_purchases'
  | 'financial_transfers'
  | 'messaging_and_emails'
  | 'publishing_content'
  | 'destructive_operations'
  | 'security_account_changes'
  | 'unsupported_url_schemes'
  | 'sensitive_field_interaction'
  | 'ambiguous_untrusted_click';

export interface SafetyPolicyRule {
  id: string;
  name: string;
  description: string;
  category: BlockedActionCategory | 'general';
  isMandatory: boolean;
  severity: SafetyRiskLevel;
}

export interface TargetMetadataSnapshot {
  actionId?: number;
  tagName?: string;
  label?: string;
  role?: string;
  isSubmitControl?: boolean;
  isInsideForm?: boolean;
  formAction?: string;
  formMethod?: string;
  href?: string;
}

export interface SafetyPolicyDecision {
  /** Unique deterministic evaluation ID */
  decisionId: string;
  /** Action ID being evaluated */
  actionId: string;
  /** Action type evaluated */
  actionType: AgentActionType;
  /** Independent deterministic risk classification */
  risk: SafetyRiskLevel;
  /** Decision status */
  decision: PolicyDecisionStatus;
  /** Human-readable explanation of the safety decision */
  reason: string;
  /** Rule IDs triggered during policy evaluation */
  applicableRules: string[];
  /** Level of user confirmation required before execution */
  requiredConfirmation: ConfirmationLevel;
  /** Whether the action is strictly blocked from execution */
  isBlocked: boolean;
  /** Category of block if blocked */
  blockedCategory?: BlockedActionCategory;
  /** Timestamp when policy evaluation occurred */
  evaluatedAt: number;
  /** Target element metadata at time of evaluation */
  targetMetadataSnapshot?: TargetMetadataSnapshot;
}

export interface SafetySettings {
  /** Whether enhanced double-confirmation is required for high-risk actions */
  enhancedConfirmationEnabled: boolean;
  /** Whether strict URL protocol and credential filtering is enabled */
  strictUrlValidation: boolean;
  /** Read-only list of mandatory blocked categories (cannot be disabled) */
  blockedCategories: BlockedActionCategory[];
}

export type SafetyAuditEventType =
  | 'policy_evaluation_started'
  | 'action_allowed'
  | 'approval_required'
  | 'enhanced_confirmation_required'
  | 'action_blocked'
  | 'invalid_action_rejected'
  | 'stale_approval_rejected'
  | 'execution_guard_rejected'
  | 'url_validation_failed'
  | 'consequential_action_detected'
  | 'target_metadata_changed';

export interface SafetyAuditEvent {
  eventId: string;
  sessionId?: string;
  actionId?: string;
  decisionId?: string;
  eventType: SafetyAuditEventType;
  risk: SafetyRiskLevel;
  decision: PolicyDecisionStatus;
  reason: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ExecutionGuardVerificationResult {
  canExecute: boolean;
  reason?: string;
  decision: SafetyPolicyDecision;
  isDryRun: boolean;
}
