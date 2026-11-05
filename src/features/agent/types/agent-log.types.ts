/**
 * Sahayak Agent Structured Action Log Types
 * Definitions for auditing, persistence, and action history tracking.
 */

import {
  AgentActionType,
  ActionRiskLevel,
  ActionApprovalStatus,
  ActionExecutionStatus,
} from './agent.types';

export type ActionLogEventType =
  | 'session_created'
  | 'instruction_received'
  | 'planning_started'
  | 'action_proposed'
  | 'action_previewed'
  | 'approval_granted'
  | 'action_rejected'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'target_not_found'
  | 'target_stale'
  | 'session_cancelled'
  | 'session_restored'
  | 'action_interrupted';

export type ActionLogFilter = 'all' | 'success' | 'failed' | 'rejected' | 'dry_run' | 'interrupted';

export interface ActionLogMetadata {
  targetActionId?: number;
  targetElementLabel?: string;
  targetTagName?: string;
  targetUrl?: string;
  direction?: string;
  amountPx?: number;
  durationMs?: number;
  didUrlChange?: boolean;
  userInstruction?: string;
  reason?: string;
  expectedResult?: string;
  pageTitle?: string;
  pageUrl?: string;
  decisionId?: string;
  decision?: string;
  safetyEventType?: string;
  [key: string]: unknown;
}

export interface ActionLogEntry {
  id: string;
  sessionId: string;
  actionId?: string;
  tabId?: number;
  eventType: ActionLogEventType;
  description: string;
  timestamp: number;
  status?: ActionExecutionStatus | ActionApprovalStatus;
  risk?: ActionRiskLevel;
  actionType?: AgentActionType;
  isDryRun: boolean;
  error?: string;
  metadata?: ActionLogMetadata;
}
