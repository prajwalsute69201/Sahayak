/**
 * Context Action Execution Service
 * Executes AI operations (Explain, Summarize, Translate, Rewrite) via Gemini streaming.
 */

import { geminiClient } from '@/services/gemini/gemini.client';
import { LanguagePreference } from '@/services/language/language.types';
import { ContextActionPayload, ContextActionResult } from '../types/context-menu.types';
import { selectionService } from './selection.service';
import { buildContextActionPrompt } from '../prompts/context-action.prompts';

export interface ExecuteActionOptions {
  payload: ContextActionPayload;
  language: LanguagePreference;
  onChunk?: (chunkText: string, fullAggregatedText: string) => void;
  signal?: AbortSignal;
}

export class ContextActionService {
  /**
   * Executes a context action request, streaming the generated result.
   */
  public async executeAction(options: ExecuteActionOptions): Promise<ContextActionResult> {
    const { payload, language, onChunk, signal } = options;

    // 1. Validate selection text
    const validation = selectionService.validateSelection(payload.selectionText);
    if (!validation.isValid) {
      return {
        id: payload.id,
        actionType: payload.actionType,
        selectionText: payload.selectionText,
        resultText: '',
        status: 'error',
        error: validation.errorMessage || 'Invalid selection text.',
        timestamp: Date.now(),
        language,
      };
    }

    // 2. Build prompt and system instructions
    const { systemInstruction, userPrompt } = buildContextActionPrompt(
      payload.actionType,
      validation.cleanText,
      language,
      { title: payload.pageTitle, url: payload.pageUrl }
    );

    // 3. Invoke Gemini Streaming Client
    try {
      const streamResult = await geminiClient.generateStream(userPrompt, {
        systemInstruction,
        temperature: payload.actionType === 'rewrite' ? 0.3 : 0.2,
        signal,
        onChunk,
      });

      const isCancelled = streamResult.finishReason === 'USER_CANCELLED';

      return {
        id: payload.id,
        actionType: payload.actionType,
        selectionText: validation.cleanText,
        resultText: streamResult.text,
        status: isCancelled ? 'idle' : 'success',
        latencyMs: streamResult.latencyMs,
        model: streamResult.model,
        timestamp: Date.now(),
        language,
      };
    } catch (err: unknown) {
      if (signal?.aborted) {
        return {
          id: payload.id,
          actionType: payload.actionType,
          selectionText: validation.cleanText,
          resultText: '',
          status: 'idle',
          timestamp: Date.now(),
          language,
        };
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to execute context action.';

      return {
        id: payload.id,
        actionType: payload.actionType,
        selectionText: validation.cleanText,
        resultText: '',
        status: 'error',
        error: errorMessage,
        timestamp: Date.now(),
        language,
      };
    }
  }
}

export const contextActionService = new ContextActionService();
export default contextActionService;
