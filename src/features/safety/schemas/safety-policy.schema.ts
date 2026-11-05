/**
 * Sahayak Deterministic Safety Schemas
 * Runtime validation for policy evaluation inputs, decisions, settings, and audit logs.
 */

import { z } from 'zod';
import {
  SafetyRiskLevel,
  PolicyDecisionStatus,
  ConfirmationLevel,
  BlockedActionCategory,
  SafetyAuditEventType,
} from '../types/safety.types';

export const safetyRiskLevelSchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]) as z.ZodType<SafetyRiskLevel>;

export const policyDecisionStatusSchema = z.enum([
  'allowed',
  'approval_required',
  'enhanced_confirmation_required',
  'blocked',
]) as z.ZodType<PolicyDecisionStatus>;

export const confirmationLevelSchema = z.enum([
  'none',
  'standard_approval',
  'enhanced_confirmation',
]) as z.ZodType<ConfirmationLevel>;

export const blockedActionCategorySchema = z.enum([
  'form_submission',
  'payments_and_purchases',
  'financial_transfers',
  'messaging_and_emails',
  'publishing_content',
  'destructive_operations',
  'security_account_changes',
  'unsupported_url_schemes',
  'sensitive_field_interaction',
  'ambiguous_untrusted_click',
]) as z.ZodType<BlockedActionCategory>;

export const safetyPolicyDecisionSchema = z.object({
  decisionId: z.string().min(1),
  actionId: z.string().min(1),
  actionType: z.enum([
    'click_element',
    'scroll_to_element',
    'scroll_page',
    'navigate_to_url',
    'highlight_element',
  ]),
  risk: safetyRiskLevelSchema,
  decision: policyDecisionStatusSchema,
  reason: z.string().min(1).max(500),
  applicableRules: z.array(z.string()),
  requiredConfirmation: confirmationLevelSchema,
  isBlocked: z.boolean(),
  blockedCategory: blockedActionCategorySchema.optional(),
  evaluatedAt: z.number().int().positive(),
  targetMetadataSnapshot: z
    .object({
      actionId: z.number().optional(),
      tagName: z.string().optional(),
      label: z.string().optional(),
      role: z.string().optional(),
      isSubmitControl: z.boolean().optional(),
      isInsideForm: z.boolean().optional(),
      formAction: z.string().optional(),
      formMethod: z.string().optional(),
      href: z.string().optional(),
    })
    .optional(),
});

export const safetySettingsSchema = z.object({
  enhancedConfirmationEnabled: z.boolean().default(true),
  strictUrlValidation: z.boolean().default(true),
  blockedCategories: z.array(blockedActionCategorySchema),
});

export const safetyAuditEventTypeSchema = z.enum([
  'policy_evaluation_started',
  'action_allowed',
  'approval_required',
  'enhanced_confirmation_required',
  'action_blocked',
  'invalid_action_rejected',
  'stale_approval_rejected',
  'execution_guard_rejected',
  'url_validation_failed',
  'consequential_action_detected',
  'target_metadata_changed',
]) as z.ZodType<SafetyAuditEventType>;

export const safetyAuditEventSchema = z.object({
  eventId: z.string().min(1),
  sessionId: z.string().optional(),
  actionId: z.string().optional(),
  decisionId: z.string().optional(),
  eventType: safetyAuditEventTypeSchema,
  risk: safetyRiskLevelSchema,
  decision: policyDecisionStatusSchema,
  reason: z.string().max(500),
  timestamp: z.number().int().positive(),
  metadata: z.record(z.unknown()).optional(),
});
