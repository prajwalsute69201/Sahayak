/**
 * Sahayak Agent Action Log Schema
 * Runtime validation for structured action logging and audit trails.
 */

import { z } from 'zod';
import { agentActionTypeSchema, actionRiskLevelSchema } from './agent-action.schema';
import { actionApprovalStatusSchema, actionExecutionStatusSchema } from './agent-session.schema';

export const CURRENT_LOG_SCHEMA_VERSION = 1;

export const actionLogEventTypeSchema = z.enum([
  'session_created',
  'instruction_received',
  'planning_started',
  'action_proposed',
  'action_previewed',
  'approval_granted',
  'action_rejected',
  'execution_started',
  'execution_completed',
  'execution_failed',
  'target_not_found',
  'target_stale',
  'session_cancelled',
  'session_restored',
  'action_interrupted',
]);

export const actionLogMetadataSchema = z.object({
  targetActionId: z.number().optional(),
  targetElementLabel: z.string().optional(),
  targetTagName: z.string().optional(),
  targetUrl: z.string().optional(),
  direction: z.string().optional(),
  amountPx: z.number().optional(),
  durationMs: z.number().optional(),
  didUrlChange: z.boolean().optional(),
  userInstruction: z.string().optional(),
  reason: z.string().optional(),
  expectedResult: z.string().optional(),
  pageTitle: z.string().optional(),
  pageUrl: z.string().optional(),
});

export const actionLogEntrySchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  actionId: z.string().optional(),
  tabId: z.number().optional(),
  eventType: actionLogEventTypeSchema,
  description: z.string(),
  timestamp: z.number(),
  status: z.union([actionExecutionStatusSchema, actionApprovalStatusSchema]).optional(),
  risk: actionRiskLevelSchema.optional(),
  actionType: agentActionTypeSchema.optional(),
  isDryRun: z.boolean().default(false),
  error: z.string().optional(),
  metadata: actionLogMetadataSchema.optional(),
});

export const actionLogCollectionSchema = z.object({
  version: z.number().default(CURRENT_LOG_SCHEMA_VERSION),
  entries: z.array(actionLogEntrySchema).default([]),
});

export type ActionLogCollection = z.infer<typeof actionLogCollectionSchema>;
