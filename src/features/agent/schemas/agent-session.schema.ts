/**
 * Sahayak Agent Session Persistence Schema
 * Runtime validation and versioned structure for saved agent sessions.
 */

import { z } from 'zod';
import { agentActionTypeSchema, actionRiskLevelSchema } from './agent-action.schema';

export const CURRENT_SESSION_SCHEMA_VERSION = 1;

export const agentSessionStateSchema = z.enum([
  'idle',
  'planning',
  'awaiting_approval',
  'executing',
  'completed',
  'failed',
  'cancelled',
  'interrupted',
]);

export const actionApprovalStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'preview_only',
]);

export const actionExecutionStatusSchema = z.enum([
  'success',
  'failed',
  'target_not_found',
  'stale_target',
  'cancelled',
  'preview_only',
  'interrupted',
  'verification_uncertain',
]);

export const persistedActionExecutionResultSchema = z.object({
  actionId: z.string(),
  actionType: agentActionTypeSchema,
  status: actionExecutionStatusSchema,
  message: z.string(),
  dispatchedAt: z.number(),
  durationMs: z.number(),
  urlBefore: z.string().optional(),
  urlAfter: z.string().optional(),
  targetAvailable: z.boolean().optional(),
  isDryRun: z.boolean().optional(),
  error: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

export const persistedAgentActionSchema = z.object({
  id: z.string(),
  type: agentActionTypeSchema,
  title: z.string(),
  description: z.string(),
  reason: z.string(),
  risk: actionRiskLevelSchema,
  expectedResult: z.string(),
  requiresStrongConfirmation: z.boolean().optional(),
  approvalStatus: actionApprovalStatusSchema,
  approvalToken: z.string().optional(),
  isDryRun: z.boolean().optional(),
  createdAt: z.number(),
  targetActionId: z.number().optional(),
  targetElementLabel: z.string().optional(),
  targetTagName: z.string().optional(),
  direction: z.enum(['up', 'down', 'top', 'bottom']).optional(),
  amountPx: z.number().optional(),
  targetUrl: z.string().optional(),
});

export const persistedAgentSessionSchema = z.object({
  version: z.number().default(CURRENT_SESSION_SCHEMA_VERSION),
  sessionId: z.string(),
  tabId: z.number(),
  userInstruction: z.string().default(''),
  state: agentSessionStateSchema.default('idle'),
  proposedAction: persistedAgentActionSchema.nullable().default(null),
  executedActions: z.array(persistedAgentActionSchema).default([]),
  actionResults: z.array(persistedActionExecutionResultSchema).default([]),
  pageTitle: z.string().optional(),
  pageUrl: z.string().optional(),
  isDryRun: z.boolean().optional().default(false),
  isRestored: z.boolean().optional().default(false),
  isInterrupted: z.boolean().optional().default(false),
  error: z.string().optional(),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
});

export type PersistedAgentSession = z.infer<typeof persistedAgentSessionSchema>;
