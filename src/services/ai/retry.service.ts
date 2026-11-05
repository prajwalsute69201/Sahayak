/**
 * Retry and Backoff Service
 * Handles exponential backoff with jitter, Retry-After header extraction,
 * and transient vs permanent error classification.
 */

import { RETRY_CONFIG } from './ai-provider.config';
import {
  AIProviderError,
  AIRateLimitError,
  AIQuotaExceededError,
  AIAuthenticationError,
  AIInvalidRequestError,
  AICapabilityError,
} from './errors/provider.errors';

export interface RetryOptions {
  maxRetries?: number;
  signal?: AbortSignal;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

export class RetryService {
  /**
   * Parses the Retry-After HTTP header value (seconds or HTTP date) into milliseconds.
   */
  public parseRetryAfter(headerValue?: string | null): number | undefined {
    if (!headerValue || typeof headerValue !== 'string') return undefined;

    const trimmed = headerValue.trim();
    if (!trimmed) return undefined;

    // Check if numeric seconds (e.g. "5" or "10")
    const seconds = parseFloat(trimmed);
    if (!isNaN(seconds) && seconds >= 0) {
      return Math.round(seconds * 1000);
    }

    // Check if HTTP date format
    const dateMs = Date.parse(trimmed);
    if (!isNaN(dateMs)) {
      const diff = dateMs - Date.now();
      return diff > 0 ? diff : 0;
    }

    return undefined;
  }

  /**
   * Calculates exponential backoff with jitter:
   * T = min(10s, 1.5s * 2^attempt) ± 300ms
   */
  public calculateBackoff(attempt: number, retryAfterMs?: number): number {
    if (retryAfterMs !== undefined && retryAfterMs > 0) {
      return Math.min(retryAfterMs, RETRY_CONFIG.maxDelayMs);
    }

    // Base exponential calculation
    const exponential = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
    const bounded = Math.min(exponential, RETRY_CONFIG.maxDelayMs);

    // Uniform jitter: ±300ms
    const jitter = (Math.random() * 2 - 1) * RETRY_CONFIG.jitterMs;
    const finalDelay = Math.round(bounded + jitter);

    return Math.max(100, Math.min(finalDelay, RETRY_CONFIG.maxDelayMs));
  }

  /**
   * Determines whether an error is transient and eligible for retry on the same provider.
   */
  public isRetryableError(error: unknown): boolean {
    if (!error) return false;

    // Permanent errors must NEVER be retried
    if (
      error instanceof AIQuotaExceededError ||
      error instanceof AIAuthenticationError ||
      error instanceof AIInvalidRequestError ||
      error instanceof AICapabilityError
    ) {
      return false;
    }

    if (error instanceof AIRateLimitError) {
      return true;
    }

    if (error instanceof AIProviderError) {
      return error.isRetryable;
    }

    if (error instanceof Error) {
      // AbortError from caller's signal should not be retried
      if (error.name === 'AbortError') {
        return false;
      }

      const msg = error.message.toLowerCase();
      // Permanent error markers
      if (
        msg.includes('invalid api key') ||
        msg.includes('api key not valid') ||
        msg.includes('unauthorized') ||
        msg.includes('forbidden') ||
        msg.includes('quota') ||
        msg.includes('resource_exhausted')
      ) {
        return false;
      }

      // Retryable network or server markers
      if (
        msg.includes('rate limit') ||
        msg.includes('429') ||
        msg.includes('500') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504') ||
        msg.includes('network') ||
        msg.includes('timeout')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Executes an async operation with bounded exponential backoff retries.
   */
  public async executeWithRetry<T>(
    operation: (attempt: number) => Promise<T>,
    options: RetryOptions = {}
  ): Promise<{ result: T; attempts: number }> {
    const maxRetries = options.maxRetries ?? RETRY_CONFIG.maxRetries;
    let attempt = 0;

    while (true) {
      try {
        const result = await operation(attempt);
        return { result, attempts: attempt + 1 };
      } catch (err: unknown) {
        // If aborted externally, fail immediately
        if (options.signal?.aborted) {
          throw err;
        }

        // If not retryable or max retries reached, throw
        if (attempt >= maxRetries || !this.isRetryableError(err)) {
          throw err;
        }

        // Calculate backoff
        let retryAfterMs: number | undefined;
        if (err instanceof AIRateLimitError) {
          retryAfterMs = err.retryAfterMs;
        }

        const delay = this.calculateBackoff(attempt, retryAfterMs);
        options.onRetry?.(attempt + 1, delay, err);

        // Wait with signal listener
        await this.delayWithSignal(delay, options.signal);
        attempt++;
      }
    }
  }

  /**
   * Promise sleep helper respecting external AbortSignal
   */
  private delayWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error('Operation aborted during retry backoff.'));
      }

      const timer = setTimeout(() => {
        if (signal) signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(new Error('Operation aborted during retry backoff.'));
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }
}

export const retryService = new RetryService();
export default retryService;
