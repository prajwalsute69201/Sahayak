/**
 * Provider Error Hierarchy and Sanitization
 * Classifies transient vs permanent errors, rate limits, and quota exhaustion.
 */

import { AIProviderName } from '../ai-provider.types';

/**
 * Sanitizes any API keys or authorization tokens from error messages
 */
export function sanitizeApiKey(message: string): string {
  if (!message || typeof message !== 'string') return '';
  return message
    .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/gsk_[A-Za-z0-9_-]{32,}/g, '[REDACTED_GROQ_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/key=[A-Za-z0-9_-]+/gi, 'key=[REDACTED]');
}

export class AIProviderError extends Error {
  public readonly provider: AIProviderName;
  public readonly code: string;
  public readonly status?: number;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    provider: AIProviderName,
    code = 'PROVIDER_ERROR',
    status?: number,
    isRetryable = false
  ) {
    super(sanitizeApiKey(message));
    this.name = 'AIProviderError';
    this.provider = provider;
    this.code = code;
    this.status = status;
    this.isRetryable = isRetryable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Transient rate-limit error (HTTP 429) eligible for exponential backoff or fallback
 */
export class AIRateLimitError extends AIProviderError {
  public readonly retryAfterMs?: number;

  constructor(message: string, provider: AIProviderName, retryAfterMs?: number) {
    super(message, provider, 'RATE_LIMIT_EXCEEDED', 429, true);
    this.name = 'AIRateLimitError';
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Quota exhausted error (HTTP 429 RESOURCE_EXHAUSTED).
 * Not retryable on the same provider; immediately eligible for fallback!
 */
export class AIQuotaExceededError extends AIProviderError {
  constructor(message: string, provider: AIProviderName) {
    super(message, provider, 'QUOTA_EXHAUSTED', 429, false);
    this.name = 'AIQuotaExceededError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Permanent authentication error (HTTP 401 or 403)
 */
export class AIAuthenticationError extends AIProviderError {
  constructor(message: string, provider: AIProviderName, status = 401) {
    super(message, provider, 'AUTHENTICATION_FAILED', status, false);
    this.name = 'AIAuthenticationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Invalid request / Bad parameters error (HTTP 400)
 */
export class AIInvalidRequestError extends AIProviderError {
  constructor(message: string, provider: AIProviderName) {
    super(message, provider, 'INVALID_REQUEST', 400, false);
    this.name = 'AIInvalidRequestError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Transient server outage error (HTTP 500, 502, 503, 504)
 */
export class AIServerError extends AIProviderError {
  constructor(message: string, provider: AIProviderName, status = 503) {
    super(message, provider, 'SERVER_ERROR', status, true);
    this.name = 'AIServerError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Network / fetch connection failure
 */
export class AINetworkError extends AIProviderError {
  constructor(provider: AIProviderName, message = 'Network connection failed.') {
    super(message, provider, 'NETWORK_ERROR', undefined, true);
    this.name = 'AINetworkError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Request timeout error
 */
export class AITimeoutError extends AIProviderError {
  constructor(provider: AIProviderName, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms.`, provider, 'TIMEOUT', 408, true);
    this.name = 'AITimeoutError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Unsupported feature/capability for this provider or model
 */
export class AICapabilityError extends AIProviderError {
  constructor(provider: AIProviderName, capability: string, details?: string) {
    super(
      `Provider '${provider}' does not support '${capability}'.${details ? ` ${details}` : ''}`,
      provider,
      'CAPABILITY_UNSUPPORTED',
      undefined,
      false
    );
    this.name = 'AICapabilityError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when all cascade providers have failed
 */
export class AICascadeExhaustedError extends Error {
  public readonly primaryProvider: AIProviderName;
  public readonly primaryError: Error;
  public readonly fallbackProvider?: AIProviderName;
  public readonly fallbackError?: Error;

  constructor(
    primaryProvider: AIProviderName,
    primaryError: Error,
    fallbackProvider?: AIProviderName,
    fallbackError?: Error
  ) {
    let msg = `AI service unavailable: Primary provider (${primaryProvider}) failed: ${primaryError.message}`;
    if (fallbackProvider && fallbackError) {
      msg += ` | Fallback provider (${fallbackProvider}) also failed: ${fallbackError.message}`;
    }
    super(sanitizeApiKey(msg));
    this.name = 'AICascadeExhaustedError';
    this.primaryProvider = primaryProvider;
    this.primaryError = primaryError;
    this.fallbackProvider = fallbackProvider;
    this.fallbackError = fallbackError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
