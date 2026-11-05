/**
 * Custom Error Hierarchies for Google Gemini API Client
 */

/** Redacts potential API keys or query params from strings before logging or display */
export function sanitizeApiError(input: string): string {
  if (!input) return '';
  return input
    .replace(/AIza[0-9A-Za-z-_]{20,50}/g, '[REDACTED_API_KEY]')
    .replace(/([?&]key=)[^&]+/gi, '$1[REDACTED_API_KEY]')
    .replace(/(x-goog-api-key:\s*)[^\s,]+/gi, '$1[REDACTED_API_KEY]');
}

export class GeminiError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly rawMessage: string;

  constructor(message: string, code = 'GEMINI_ERROR', status?: number) {
    const cleanMessage = sanitizeApiError(message);
    super(cleanMessage);
    this.name = 'GeminiError';
    this.code = code;
    this.status = status;
    this.rawMessage = cleanMessage;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class GeminiApiKeyMissingError extends GeminiError {
  constructor(
    message = 'Gemini API key is not configured. Please add your key in Sahayak Settings.'
  ) {
    super(message, 'API_KEY_MISSING', 401);
    this.name = 'GeminiApiKeyMissingError';
  }
}

export class GeminiAuthenticationError extends GeminiError {
  constructor(message = 'Invalid or expired Gemini API key. Please check your key in Settings.') {
    super(message, 'AUTHENTICATION_FAILED', 403);
    this.name = 'GeminiAuthenticationError';
  }
}

export class GeminiRateLimitError extends GeminiError {
  public readonly retryAfterSeconds?: number;

  constructor(
    message = 'Gemini API rate limit exceeded (HTTP 429). Please wait before making another request.',
    retryAfterSeconds?: number
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'GeminiRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class GeminiQuotaExceededError extends GeminiError {
  constructor(
    message = 'Gemini API quota exceeded for your project. Please review your Google AI Studio quota limits.'
  ) {
    super(message, 'QUOTA_EXCEEDED', 429);
    this.name = 'GeminiQuotaExceededError';
  }
}

export class GeminiNetworkError extends GeminiError {
  constructor(
    message = 'Unable to connect to Google Gemini API. Please check your internet connection.'
  ) {
    super(message, 'NETWORK_ERROR');
    this.name = 'GeminiNetworkError';
  }
}

export class GeminiTimeoutError extends GeminiError {
  constructor(timeoutMs: number) {
    super(`Gemini API request timed out after ${timeoutMs}ms.`, 'REQUEST_TIMEOUT', 408);
    this.name = 'GeminiTimeoutError';
  }
}

export class GeminiSafetyBlockError extends GeminiError {
  public readonly blockReason?: string;

  constructor(
    message = 'The prompt or generated content was blocked by Gemini safety guidelines.',
    blockReason?: string
  ) {
    super(message, 'CONTENT_BLOCKED_BY_SAFETY');
    this.name = 'GeminiSafetyBlockError';
    this.blockReason = blockReason;
  }
}

export class GeminiInvalidRequestError extends GeminiError {
  constructor(message = 'Invalid prompt or request parameters provided.') {
    super(message, 'INVALID_REQUEST', 400);
    this.name = 'GeminiInvalidRequestError';
  }
}
