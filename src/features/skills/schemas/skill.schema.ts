/**
 * Sahayak Skill Zod Validation Schemas
 * Runtime validation for skills, parameters, templates, and execution records.
 */

import { z } from 'zod';
import {
  SkillCategory,
  SkillExecutionRoute,
  SkillParameterType,
  SkillSource,
  SupportedPageType,
} from '../types/skill.types';

export const CURRENT_SKILL_SCHEMA_VERSION = 1;
export const MAX_SKILL_NAME_LENGTH = 80;
export const MAX_SKILL_DESC_LENGTH = 300;
export const MAX_TEMPLATE_LENGTH = 4000;
export const MAX_CUSTOM_SKILLS_COUNT = 150;
export const MAX_HISTORY_ENTRIES = 100;
export const MAX_IMPORT_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export const skillCategorySchema = z.enum([
  'summarization',
  'research',
  'productivity',
  'writing',
  'navigation',
  'page_interaction',
  'custom',
]) as z.ZodType<SkillCategory>;

export const skillSourceSchema = z.enum(['built_in', 'user_created']) as z.ZodType<SkillSource>;

export const supportedPageTypeSchema = z.enum([
  'any',
  'article',
  'youtube',
  'interactive',
  'selection',
]) as z.ZodType<SupportedPageType>;

export const skillExecutionRouteSchema = z.enum([
  'summarize',
  'youtube',
  'chat',
  'rewrite',
  'find_element',
  'agent_action',
]) as z.ZodType<SkillExecutionRoute>;

export const skillParameterTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'select',
]) as z.ZodType<SkillParameterType>;

export const skillParameterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Parameter identifier cannot be empty')
    .max(50)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Parameter name must contain only letters, numbers, dashes or underscores'
    ),
  label: z.string().trim().min(1, 'Parameter label is required').max(80),
  description: z.string().max(200).optional(),
  type: skillParameterTypeSchema,
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  options: z.array(z.string().trim()).optional(),
  required: z.boolean().default(false),
  placeholder: z.string().max(100).optional(),
});

export const skillSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, 'Skill ID is required')
    .max(100)
    .regex(/^[a-zA-Z0-9_:-]+$/, 'Invalid Skill ID format'),
  name: z
    .string()
    .trim()
    .min(1, 'Skill name cannot be empty')
    .max(MAX_SKILL_NAME_LENGTH, `Name cannot exceed ${MAX_SKILL_NAME_LENGTH} characters`),
  description: z
    .string()
    .trim()
    .min(1, 'Skill description cannot be empty')
    .max(MAX_SKILL_DESC_LENGTH, `Description cannot exceed ${MAX_SKILL_DESC_LENGTH} characters`),
  category: skillCategorySchema,
  icon: z.string().default('Sparkles'),
  instructionTemplate: z
    .string()
    .trim()
    .min(1, 'Instruction template cannot be empty')
    .max(MAX_TEMPLATE_LENGTH, `Template cannot exceed ${MAX_TEMPLATE_LENGTH} characters`),
  parameters: z.array(skillParameterSchema).default([]),
  supportedPageTypes: z.array(supportedPageTypeSchema).min(1).default(['any']),
  executionRoute: skillExecutionRouteSchema.default('chat'),
  source: skillSourceSchema.default('user_created'),
  version: z.number().int().min(1).default(CURRENT_SKILL_SCHEMA_VERSION),
  isEnabled: z.boolean().default(true),
  isFavorite: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const skillExecutionRecordSchema = z.object({
  executionId: z.string().min(1),
  skillId: z.string().min(1),
  skillName: z.string().min(1),
  category: skillCategorySchema,
  route: skillExecutionRouteSchema,
  tabId: z.number().optional(),
  pageUrl: z.string(),
  pageTitle: z.string(),
  status: z.enum(['started', 'completed', 'failed', 'cancelled', 'unsupported_context']),
  renderedInstruction: z.string(),
  inputs: z.record(z.union([z.string(), z.number(), z.boolean()])),
  outputSummary: z.string().optional(),
  error: z.string().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  durationMs: z.number().optional(),
});

export const skillExportPackageSchema = z.object({
  format: z.literal('sahayak-skills'),
  version: z.number().int().min(1).max(CURRENT_SKILL_SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  skills: z.array(skillSchema),
});

export type ValidatedSkill = z.infer<typeof skillSchema>;
export type ValidatedSkillParameter = z.infer<typeof skillParameterSchema>;
export type ValidatedSkillExecutionRecord = z.infer<typeof skillExecutionRecordSchema>;
export type ValidatedSkillExportPackage = z.infer<typeof skillExportPackageSchema>;
