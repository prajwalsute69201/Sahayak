/**
 * Sahayak Local Profile Memory Zod Schemas
 * Runtime validation for on-device memories and configurations.
 */

import { z } from 'zod';
import { MemoryCategory, MemorySource, MemoryProposalAction } from '../types/memory.types';

export const CURRENT_MEMORY_SCHEMA_VERSION = 1;
export const MAX_MEMORIES_COUNT = 200;
export const MAX_TITLE_LENGTH = 120;
export const MAX_CONTENT_LENGTH = 1000;
export const MAX_TAGS_COUNT = 10;
export const MAX_TAG_LENGTH = 30;

export const memoryCategorySchema = z.enum([
  'preferences',
  'personal_profile',
  'work_context',
  'language_preferences',
  'interaction_preferences',
  'custom',
]) as z.ZodType<MemoryCategory>;

export const memorySourceSchema = z.enum([
  'explicit_instruction',
  'manual_entry',
  'suggestion_accepted',
]) as z.ZodType<MemorySource>;

export const memoryProposalActionSchema = z.enum([
  'create',
  'update',
  'delete',
]) as z.ZodType<MemoryProposalAction>;

export const memoryRecordSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  category: memoryCategorySchema,
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(MAX_TITLE_LENGTH, `Title cannot exceed ${MAX_TITLE_LENGTH} characters`),
  content: z
    .string()
    .trim()
    .min(1, 'Content cannot be empty')
    .max(MAX_CONTENT_LENGTH, `Content cannot exceed ${MAX_CONTENT_LENGTH} characters`),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(MAX_TAG_LENGTH)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Tags must be alphanumeric with dashes or underscores')
    )
    .max(MAX_TAGS_COUNT, `Cannot exceed ${MAX_TAGS_COUNT} tags`)
    .default([]),
  source: memorySourceSchema,
  isApproved: z.boolean().default(true),
  createdAt: z.string().datetime({ message: 'Invalid createdAt ISO timestamp' }),
  updatedAt: z.string().datetime({ message: 'Invalid updatedAt ISO timestamp' }),
  confidence: z.number().min(0).max(1).optional(),
});

export const memoryProposalSchema = z.object({
  id: z.string().min(1),
  action: memoryProposalActionSchema,
  category: memoryCategorySchema,
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  content: z.string().trim().min(1).max(MAX_CONTENT_LENGTH),
  tags: z.array(z.string().trim()).max(MAX_TAGS_COUNT).default([]),
  source: memorySourceSchema,
  confidence: z.number().min(0).max(1),
  targetMemoryId: z.string().optional(),
  existingMemory: memoryRecordSchema.optional(),
  triggerText: z.string().min(1),
});

export const memorySettingsSchema = z.object({
  personalizationEnabled: z.boolean().default(true),
  suggestionsEnabled: z.boolean().default(true),
  maxContextItems: z.number().int().min(1).max(10).default(4),
});

export const memoryStorageCollectionSchema = z.object({
  version: z.number().int().default(CURRENT_MEMORY_SCHEMA_VERSION),
  memories: z.array(memoryRecordSchema).default([]),
  updatedAt: z.string().datetime(),
});

export type ValidatedMemoryRecord = z.infer<typeof memoryRecordSchema>;
export type ValidatedMemoryProposal = z.infer<typeof memoryProposalSchema>;
export type ValidatedMemorySettings = z.infer<typeof memorySettingsSchema>;
export type ValidatedMemoryStorageCollection = z.infer<typeof memoryStorageCollectionSchema>;
