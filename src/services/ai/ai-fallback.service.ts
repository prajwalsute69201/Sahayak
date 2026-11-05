/**
 * AI Fallback Cascade Service
 * Orchestrates retry policies and seamless failover between Gemini and Groq.
 */

import { storageService } from '@/services/storage.service';
import { SETTINGS_STORAGE_KEY, UserSettings } from '@/types/settings.types';
import {
  AIProviderName,
  AIGenerateRequest,
  AIStreamRequest,
  AIMultimodalRequest,
  AINormalizedResult,
} from './ai-provider.types';
import { AIProvider } from './ai-provider.interface';
import {
  AIQuotaExceededError,
  AIRateLimitError,
  AIServerError,
  AINetworkError,
  AITimeoutError,
  AICascadeExhaustedError,
} from './errors/provider.errors';
import { retryService } from './retry.service';

export interface FallbackCascadeOptions {
  onFallback?: (from: AIProviderName, to: AIProviderName, reason: string) => void;
  onRetry?: (provider: AIProviderName, attempt: number, delayMs: number) => void;
}

export class AIFallbackService {
  /**
   * Evaluates if a given error is eligible to trigger fallback to the secondary provider.
   */
  public isFallbackEligibleError(error: unknown): boolean {
    if (!error) return false;

    // Quota exhaustion triggers immediate fallback
    if (error instanceof AIQuotaExceededError) {
      return true;
    }

    // Rate limits, server outages, network errors, timeouts that exhausted retries
    if (
      error instanceof AIRateLimitError ||
      error instanceof AIServerError ||
      error instanceof AINetworkError ||
      error instanceof AITimeoutError
    ) {
      return true;
    }

    if (error instanceof Error) {
      // User cancellation should never trigger fallback
      if (error.name === 'AbortError') return false;

      const msg = error.message.toLowerCase();
      if (msg.includes('aborted by user')) return false;

      if (
        msg.includes('quota') ||
        msg.includes('resource_exhausted') ||
        msg.includes('rate limit') ||
        msg.includes('429') ||
        msg.includes('500') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504') ||
        msg.includes('network')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Executes a text request across primary and fallback providers.
   */
  public async executeTextWithFallback(
    primaryProvider: AIProvider,
    fallbackProvider: AIProvider | null,
    request: AIGenerateRequest,
    options: FallbackCascadeOptions = {}
  ): Promise<AINormalizedResult> {
    const settings = await storageService.get<UserSettings>(SETTINGS_STORAGE_KEY);
    const fallbackEnabled = settings?.enableFallback !== false;

    // 1. Attempt on primary provider with retries
    try {
      const { result, attempts } = await retryService.executeWithRetry(
        () => primaryProvider.generateText(request),
        {
          signal: request.signal,
          onRetry: (attempt, delayMs) => {
            options.onRetry?.(primaryProvider.name, attempt, delayMs);
          },
        }
      );

      return {
        ...result,
        attempts,
        fallbackTriggered: false,
      };
    } catch (primaryErr: unknown) {
      // If user aborted, throw immediately
      if (request.signal?.aborted) {
        throw primaryErr;
      }

      // 2. Check fallback eligibility
      const isEligible = this.isFallbackEligibleError(primaryErr);
      const canFallback =
        fallbackEnabled &&
        fallbackProvider !== null &&
        fallbackProvider.capabilities.text &&
        isEligible;

      if (!canFallback) {
        throw primaryErr;
      }

      // 3. Trigger fallback
      const reason =
        primaryErr instanceof Error ? primaryErr.message : 'Primary provider unavailable';
      options.onFallback?.(primaryProvider.name, fallbackProvider.name, reason);

      try {
        const { result, attempts } = await retryService.executeWithRetry(
          () => fallbackProvider.generateText(request),
          {
            signal: request.signal,
            onRetry: (attempt, delayMs) => {
              options.onRetry?.(fallbackProvider.name, attempt, delayMs);
            },
          }
        );

        return {
          ...result,
          attempts,
          fallbackTriggered: true,
          fallbackReason: reason,
        };
      } catch (fallbackErr: unknown) {
        throw new AICascadeExhaustedError(
          primaryProvider.name,
          primaryErr as Error,
          fallbackProvider.name,
          fallbackErr as Error
        );
      }
    }
  }

  /**
   * Executes a streaming request with safe fallback handling.
   * If partial chunks have already reached the caller, fallback is bypassed to avoid duplicate output.
   */
  public async executeStreamWithFallback(
    primaryProvider: AIProvider,
    fallbackProvider: AIProvider | null,
    request: AIStreamRequest,
    options: FallbackCascadeOptions = {}
  ): Promise<AINormalizedResult> {
    const settings = await storageService.get<UserSettings>(SETTINGS_STORAGE_KEY);
    const fallbackEnabled = settings?.enableFallback !== false;

    let hasEmittedChunks = false;
    const interceptedOnChunk = (chunk: string, fullText: string) => {
      hasEmittedChunks = true;
      request.onChunk?.(chunk, fullText);
    };

    try {
      const { result, attempts } = await retryService.executeWithRetry(
        () =>
          primaryProvider.generateStream({
            ...request,
            onChunk: interceptedOnChunk,
          }),
        {
          signal: request.signal,
          onRetry: (attempt, delayMs) => {
            options.onRetry?.(primaryProvider.name, attempt, delayMs);
          },
        }
      );

      return {
        ...result,
        attempts,
        fallbackTriggered: false,
      };
    } catch (primaryErr: unknown) {
      if (request.signal?.aborted || hasEmittedChunks) {
        // If stream already started delivering output, do not restart with another provider!
        throw primaryErr;
      }

      const isEligible = this.isFallbackEligibleError(primaryErr);
      const canFallback =
        fallbackEnabled &&
        fallbackProvider !== null &&
        fallbackProvider.capabilities.streaming &&
        isEligible;

      if (!canFallback) {
        throw primaryErr;
      }

      const reason =
        primaryErr instanceof Error ? primaryErr.message : 'Primary stream unavailable';
      options.onFallback?.(primaryProvider.name, fallbackProvider.name, reason);

      try {
        const { result, attempts } = await retryService.executeWithRetry(
          () => fallbackProvider.generateStream(request),
          {
            signal: request.signal,
            onRetry: (attempt, delayMs) => {
              options.onRetry?.(fallbackProvider.name, attempt, delayMs);
            },
          }
        );

        return {
          ...result,
          attempts,
          fallbackTriggered: true,
          fallbackReason: reason,
        };
      } catch (fallbackErr: unknown) {
        throw new AICascadeExhaustedError(
          primaryProvider.name,
          primaryErr as Error,
          fallbackProvider.name,
          fallbackErr as Error
        );
      }
    }
  }

  /**
   * Executes a multimodal request.
   * If a provider lacks multimodal vision capabilities, fallback routes to a capable provider or warns.
   */
  public async executeMultimodalWithFallback(
    primaryProvider: AIProvider,
    fallbackProvider: AIProvider | null,
    request: AIMultimodalRequest,
    options: FallbackCascadeOptions = {}
  ): Promise<AINormalizedResult> {
    // If primary provider does not support multimodal, route directly to fallback if it supports it
    if (!primaryProvider.capabilities.multimodal) {
      if (fallbackProvider?.capabilities.multimodal && fallbackProvider.generateMultimodal) {
        return fallbackProvider.generateMultimodal(request);
      }
      throw new Error(`Provider '${primaryProvider.name}' does not support multimodal requests.`);
    }

    if (!primaryProvider.generateMultimodal) {
      throw new Error(`Provider '${primaryProvider.name}' has no multimodal implementation.`);
    }

    // Attempt primary multimodal execution
    try {
      const { result, attempts } = await retryService.executeWithRetry(
        () => primaryProvider.generateMultimodal!(request),
        {
          signal: request.signal,
          onRetry: (attempt, delayMs) => {
            options.onRetry?.(primaryProvider.name, attempt, delayMs);
          },
        }
      );

      return {
        ...result,
        attempts,
        fallbackTriggered: false,
      };
    } catch (primaryErr: unknown) {
      // Fallback is only possible if fallback provider actually supports multimodal vision
      if (
        fallbackProvider?.capabilities.multimodal &&
        fallbackProvider.generateMultimodal &&
        this.isFallbackEligibleError(primaryErr)
      ) {
        const reason =
          primaryErr instanceof Error ? primaryErr.message : 'Primary multimodal unavailable';
        options.onFallback?.(primaryProvider.name, fallbackProvider.name, reason);

        const { result, attempts } = await retryService.executeWithRetry(
          () => fallbackProvider.generateMultimodal!(request),
          { signal: request.signal }
        );

        return {
          ...result,
          attempts,
          fallbackTriggered: true,
          fallbackReason: reason,
        };
      }

      // If fallback cannot handle images, report primary error clearly
      throw primaryErr;
    }
  }
}

export const aiFallbackService = new AIFallbackService();
export default aiFallbackService;
