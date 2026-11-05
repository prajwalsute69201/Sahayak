/**
 * Context-Menu AI Actions Types for Sahayak
 * Defines payloads, results, and action types for browser context-menu integration.
 */

export type ContextActionType = 'explain' | 'summarize' | 'translate' | 'rewrite' | 'ask';

export interface ContextActionPayload {
  id: string;
  actionType: ContextActionType;
  selectionText: string;
  pageUrl?: string;
  pageTitle?: string;
  timestamp: number;
  tabId?: number;
  windowId?: number;
}

export interface ContextActionResult {
  id: string;
  actionType: ContextActionType;
  selectionText: string;
  resultText: string;
  status: 'idle' | 'loading' | 'streaming' | 'success' | 'error';
  error?: string;
  latencyMs?: number;
  model?: string;
  timestamp: number;
  language?: 'en' | 'hi-en' | 'auto';
}

export interface SelectionValidationResult {
  isValid: boolean;
  cleanText: string;
  wordCount: number;
  charCount: number;
  isExcessive: boolean;
  errorMessage?: string;
}

export const PENDING_CONTEXT_ACTION_KEY = 'sahayak_pending_context_action';
