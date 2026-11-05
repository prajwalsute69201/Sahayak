/**
 * Sahayak Agent Action Zod Validation Schema
 * Enforces strict runtime validation on AI-generated action structures.
 */

import { z } from 'zod';

export const agentActionTypeSchema = z.enum([
  'click_element',
  'scroll_to_element',
  'scroll_page',
  'navigate_to_url',
  'highlight_element',
]);

export const actionRiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

// Click Element Schema
export const clickElementActionSchema = z.object({
  type: z.literal('click_element'),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  reason: z.string().min(1).max(300),
  risk: actionRiskLevelSchema.default('low'),
  expectedResult: z.string().min(1).max(300),
  targetActionId: z.number().int().positive(),
  targetElementLabel: z.string().optional(),
});

// Scroll to Element Schema
export const scrollToElementActionSchema = z.object({
  type: z.literal('scroll_to_element'),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  reason: z.string().min(1).max(300),
  risk: actionRiskLevelSchema.default('low'),
  expectedResult: z.string().min(1).max(300),
  targetActionId: z.number().int().positive(),
  targetElementLabel: z.string().optional(),
});

// Scroll Page Schema
export const scrollPageActionSchema = z.object({
  type: z.literal('scroll_page'),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  reason: z.string().min(1).max(300),
  risk: actionRiskLevelSchema.default('low'),
  expectedResult: z.string().min(1).max(300),
  direction: z.enum(['up', 'down', 'top', 'bottom']),
  amountPx: z.number().int().positive().max(5000).optional(),
});

// Navigate to URL Schema (Strict http/https enforcement)
export const navigateToUrlActionSchema = z.object({
  type: z.literal('navigate_to_url'),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  reason: z.string().min(1).max(300),
  risk: actionRiskLevelSchema.default('medium'),
  expectedResult: z.string().min(1).max(300),
  targetUrl: z
    .string()
    .url()
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      },
      {
        message: 'Navigation URL must strictly use http:// or https:// protocol.',
      }
    ),
});

// Highlight Element Schema
export const highlightElementActionSchema = z.object({
  type: z.literal('highlight_element'),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  reason: z.string().min(1).max(300),
  risk: actionRiskLevelSchema.default('low'),
  expectedResult: z.string().min(1).max(300),
  targetActionId: z.number().int().positive(),
  targetElementLabel: z.string().optional(),
});

// Discriminated Union for Raw Proposal
export const rawAgentActionProposalSchema = z.discriminatedUnion('type', [
  clickElementActionSchema,
  scrollToElementActionSchema,
  scrollPageActionSchema,
  navigateToUrlActionSchema,
  highlightElementActionSchema,
]);

export const rawAgentPlanResponseSchema = z.object({
  action: rawAgentActionProposalSchema,
  explanation: z.string().optional(),
});

export type RawAgentActionProposal = z.infer<typeof rawAgentActionProposalSchema>;
export type RawAgentPlanResponse = z.infer<typeof rawAgentPlanResponseSchema>;
