/**
 * Sahayak Single-Step Agent & HITL Types (Slice 12)
 * Strongly typed action schemas, approval models, execution results, and session state.
 */

import { ScannedElement } from '@/features/element-scanner';

export type AgentActionType =
  'click_element' | 'scroll_to_element' | 'scroll_page' | 'navigate_to_url' | 'highlight_element';

export type ActionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ActionApprovalStatus =
  'pending' | 'approved' | 'rejected' | 'cancelled' | 'preview_only';

export type ActionExecutionStatus =
  | 'success'
  | 'failed'
  | 'target_not_found'
  | 'stale_target'
  | 'cancelled'
  | 'preview_only'
  | 'interrupted'
  | 'verification_uncertain';

export type AgentSessionState =
  | 'idle'
  | 'planning'
  | 'awaiting_approval'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted';

export interface BaseAgentAction {
  /** Unique proposal identifier */
  id: string;
  type: AgentActionType;
  title: string;
  description: string;
  reason: string;
  risk: ActionRiskLevel;
  expectedResult: string;
  requiresStrongConfirmation?: boolean;
  approvalStatus: ActionApprovalStatus;
  approvalToken?: string;
  isDryRun?: boolean;
  createdAt: number;
}

export interface ClickElementAction extends BaseAgentAction {
  type: 'click_element';
  targetActionId: number;
  targetElementLabel?: string;
  targetTagName?: string;
}

export interface ScrollToElementAction extends BaseAgentAction {
  type: 'scroll_to_element';
  targetActionId: number;
  targetElementLabel?: string;
  targetTagName?: string;
}

export interface ScrollPageAction extends BaseAgentAction {
  type: 'scroll_page';
  direction: 'up' | 'down' | 'top' | 'bottom';
  amountPx?: number;
}

export interface NavigateToUrlAction extends BaseAgentAction {
  type: 'navigate_to_url';
  targetUrl: string;
}

export interface HighlightElementAction extends BaseAgentAction {
  type: 'highlight_element';
  targetActionId: number;
  targetElementLabel?: string;
  targetTagName?: string;
}

export type AgentAction =
  | ClickElementAction
  | ScrollToElementAction
  | ScrollPageAction
  | NavigateToUrlAction
  | HighlightElementAction;

export interface ActionExecutionResult {
  actionId: string;
  actionType: AgentActionType;
  status: ActionExecutionStatus;
  message: string;
  dispatchedAt: number;
  durationMs: number;
  urlBefore?: string;
  urlAfter?: string;
  targetAvailable?: boolean;
  isDryRun?: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

export interface AgentSession {
  version: number;
  sessionId: string;
  tabId: number;
  userInstruction: string;
  state: AgentSessionState;
  proposedAction: AgentAction | null;
  executedActions: AgentAction[];
  actionResults: ActionExecutionResult[];
  pageTitle?: string;
  pageUrl?: string;
  isDryRun?: boolean;
  isRestored?: boolean;
  isInterrupted?: boolean;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/** Content Script Action Message */
export interface ExecuteAgentActionMessage {
  type: 'EXECUTE_AGENT_ACTION';
  action: AgentAction;
  approvalToken: string;
}

export interface AgentPlannerContext {
  instruction: string;
  pageTitle: string;
  pageUrl: string;
  candidates: ScannedElement[];
  previousActionResults?: ActionExecutionResult[];
}
