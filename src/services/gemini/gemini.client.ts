/**
 * Google Gemini REST API Client for Sahayak
 * Direct, zero-SDK communication with Google AI Studio endpoints.
 */

import { storageService } from '@/services/storage.service';
import { SETTINGS_STORAGE_KEY, UserSettings } from '@/types/settings.types';
import {
  GeminiGenerateOptions,
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
  GeminiTextResult,
  GeminiApiErrorResponse,
  GeminiStreamOptions,
  GeminiStreamResult,
  GeminiContent,
  GeminiUsageMetadata,
  GeminiImageInput,
  GeminiMultimodalOptions,
} from './gemini.types';
import {
  GeminiError,
  GeminiApiKeyMissingError,
  GeminiAuthenticationError,
  GeminiRateLimitError,
  GeminiQuotaExceededError,
  GeminiNetworkError,
  GeminiTimeoutError,
  GeminiSafetyBlockError,
  GeminiInvalidRequestError,
  sanitizeApiError,
} from './gemini.errors';

export class GeminiClient {
  private static readonly BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  private static readonly DEFAULT_MODEL = 'gemini-2.0-flash-lite';
  private static readonly DEFAULT_TIMEOUT_MS = 30000;

  /**
   * Resolves the active Gemini API key from explicit parameter or local storage.
   */
  public async resolveApiKey(overrideKey?: string): Promise<string> {
    if (overrideKey && overrideKey.trim().length > 0) {
      return overrideKey.trim();
    }

    const settings = await storageService.get<UserSettings>(SETTINGS_STORAGE_KEY);
    const key = settings?.geminiApiKey?.trim();

    if (!key) {
      throw new GeminiApiKeyMissingError();
    }

    return key;
  }

  /**
   * Generates a text response from a prompt using Gemini.
   */
  public async generateText(
    prompt: string,
    options: GeminiGenerateOptions = {}
  ): Promise<GeminiTextResult> {
    // 1. Validate prompt input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new GeminiInvalidRequestError('Prompt must be a non-empty string.');
    }

    // 2. Resolve API key
    const apiKey = await this.resolveApiKey(options.apiKey);

    // 3. Resolve model and parameters
    const model = options.model || GeminiClient.DEFAULT_MODEL;
    const timeoutMs = options.timeoutMs ?? GeminiClient.DEFAULT_TIMEOUT_MS;
    const endpoint = `${GeminiClient.BASE_URL}/${encodeURIComponent(model)}:generateContent`;

    // 4. Construct request payload adhering to Gemini v1beta schema
    const requestBody: GeminiGenerateContentRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt.trim() }],
        },
      ],
    };

    if (options.systemInstruction && options.systemInstruction.trim()) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemInstruction.trim() }],
      };
    }

    if (
      options.temperature !== undefined ||
      options.topP !== undefined ||
      options.topK !== undefined ||
      options.maxOutputTokens !== undefined ||
      options.stopSequences !== undefined
    ) {
      requestBody.generationConfig = {
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.topP !== undefined && { topP: options.topP }),
        ...(options.topK !== undefined && { topK: options.topK }),
        ...(options.maxOutputTokens !== undefined && { maxOutputTokens: options.maxOutputTokens }),
        ...(options.stopSequences && { stopSequences: options.stopSequences }),
      };
    }

    // 5. Setup timeout abort controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Chain with external signal if provided
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    const startTime = performance.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const latencyMs = Math.round(performance.now() - startTime);

      // 6. Handle HTTP error status codes
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      // 7. Parse response body
      const data: GeminiGenerateContentResponse = await response.json();

      // Check prompt-level safety blocks
      if (data.promptFeedback?.blockReason) {
        throw new GeminiSafetyBlockError(
          `Request was blocked by Gemini (${data.promptFeedback.blockReason}).`,
          data.promptFeedback.blockReason
        );
      }

      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new GeminiError('Gemini did not return any candidates for this prompt.');
      }

      if (candidate.finishReason === 'SAFETY') {
        throw new GeminiSafetyBlockError(
          'Generation was halted due to Gemini safety restrictions.',
          'SAFETY'
        );
      }

      // Concatenate text parts
      const generatedText = (candidate.content?.parts || [])
        .map((p) => p.text || '')
        .join('')
        .trim();

      return {
        text: generatedText,
        model: data.modelVersion || model,
        finishReason: candidate.finishReason,
        usageMetadata: data.usageMetadata,
        latencyMs,
      };
    } catch (err: unknown) {
      if (err instanceof GeminiError) {
        throw err;
      }

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new GeminiTimeoutError(timeoutMs);
        }
        if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
          throw new GeminiNetworkError();
        }
        throw new GeminiError(sanitizeApiError(err.message));
      }

      throw new GeminiNetworkError();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generates a multimodal response from text prompt and image inputs using Gemini.
   */
  public async generateMultimodal(
    prompt: string,
    images: GeminiImageInput[],
    options: GeminiMultimodalOptions = {}
  ): Promise<GeminiTextResult> {
    // 1. Validate prompt input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new GeminiInvalidRequestError('Prompt must be a non-empty string.');
    }

    // 2. Validate images array
    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new GeminiInvalidRequestError(
        'At least one image input is required for multimodal generation.'
      );
    }

    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
    for (const img of images) {
      if (!img.data || typeof img.data !== 'string' || img.data.trim().length === 0) {
        throw new GeminiInvalidRequestError('Image data must be a non-empty base64 string.');
      }
      if (!img.mimeType || typeof img.mimeType !== 'string') {
        throw new GeminiInvalidRequestError('Image mimeType is required.');
      }
      if (!allowedMimes.includes(img.mimeType.toLowerCase())) {
        throw new GeminiInvalidRequestError(
          `Unsupported image format: ${img.mimeType}. Supported formats: ${allowedMimes.join(', ')}`
        );
      }
    }

    // 3. Resolve API key
    const apiKey = await this.resolveApiKey(options.apiKey);

    // 4. Resolve model and parameters
    const model = options.model || GeminiClient.DEFAULT_MODEL;
    const timeoutMs = options.timeoutMs ?? GeminiClient.DEFAULT_TIMEOUT_MS;
    const endpoint = `${GeminiClient.BASE_URL}/${encodeURIComponent(model)}:generateContent`;

    // 5. Construct parts array: image inlineData followed by text prompt
    const parts = [
      ...images.map((img) => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data.replace(/^data:image\/[a-zA-Z]+;base64,/, '').trim(),
        },
      })),
      { text: prompt.trim() },
    ];

    const requestBody: GeminiGenerateContentRequest = {
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
    };

    if (options.systemInstruction && options.systemInstruction.trim()) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemInstruction.trim() }],
      };
    }

    if (
      options.temperature !== undefined ||
      options.topP !== undefined ||
      options.topK !== undefined ||
      options.maxOutputTokens !== undefined ||
      options.stopSequences !== undefined
    ) {
      requestBody.generationConfig = {
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.topP !== undefined && { topP: options.topP }),
        ...(options.topK !== undefined && { topK: options.topK }),
        ...(options.maxOutputTokens !== undefined && { maxOutputTokens: options.maxOutputTokens }),
        ...(options.stopSequences && { stopSequences: options.stopSequences }),
      };
    }

    // 6. Setup timeout abort controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    const startTime = performance.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data: GeminiGenerateContentResponse = await response.json();

      if (data.promptFeedback?.blockReason) {
        throw new GeminiSafetyBlockError(
          `Request was blocked by Gemini (${data.promptFeedback.blockReason}).`,
          data.promptFeedback.blockReason
        );
      }

      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new GeminiError('Gemini did not return any candidates for this visual prompt.');
      }

      if (candidate.finishReason === 'SAFETY') {
        throw new GeminiSafetyBlockError(
          'Generation was halted due to Gemini safety restrictions.',
          'SAFETY'
        );
      }

      const generatedText = (candidate.content?.parts || [])
        .map((p) => p.text || '')
        .join('')
        .trim();

      return {
        text: generatedText,
        model: data.modelVersion || model,
        finishReason: candidate.finishReason,
        usageMetadata: data.usageMetadata,
        latencyMs,
      };
    } catch (err: unknown) {
      if (err instanceof GeminiError) {
        throw err;
      }

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new GeminiTimeoutError(timeoutMs);
        }
        if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
          throw new GeminiNetworkError();
        }
        throw new GeminiError(sanitizeApiError(err.message));
      }

      throw new GeminiNetworkError();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generates a streaming multimodal response using Gemini SSE stream endpoint.
   */
  public async generateMultimodalStream(
    promptOrContents: string | GeminiContent[],
    images: GeminiImageInput[] = [],
    options: GeminiStreamOptions = {}
  ): Promise<GeminiStreamResult> {
    if (typeof promptOrContents === 'string') {
      const parts = [
        ...images.map((img) => ({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data.replace(/^data:image\/[a-zA-Z]+;base64,/, '').trim(),
          },
        })),
        { text: promptOrContents.trim() },
      ];
      return this.generateStream([{ role: 'user', parts }], options);
    }

    return this.generateStream(promptOrContents, options);
  }

  /**
   * Generates a streaming text response using Gemini SSE stream endpoint.
   * Chunks are emitted incrementally via options.onChunk callback.
   * If cancelled via options.signal, returns already received chunks gracefully.
   */
  public async generateStream(
    promptOrContents: string | GeminiContent[],
    options: GeminiStreamOptions = {}
  ): Promise<GeminiStreamResult> {
    // 1. Validate prompt input
    if (typeof promptOrContents === 'string') {
      if (!promptOrContents || promptOrContents.trim().length === 0) {
        throw new GeminiInvalidRequestError('Prompt must be a non-empty string.');
      }
    } else if (Array.isArray(promptOrContents)) {
      if (promptOrContents.length === 0) {
        throw new GeminiInvalidRequestError('Contents array must not be empty.');
      }
    } else {
      throw new GeminiInvalidRequestError('Invalid prompt or contents input.');
    }

    // 2. Resolve API key
    const apiKey = await this.resolveApiKey(options.apiKey);

    // 3. Resolve model and parameters
    const model = options.model || GeminiClient.DEFAULT_MODEL;
    const timeoutMs = options.timeoutMs ?? GeminiClient.DEFAULT_TIMEOUT_MS;
    const endpoint = `${GeminiClient.BASE_URL}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

    // 4. Construct request payload
    const requestBody: GeminiGenerateContentRequest = {
      contents:
        typeof promptOrContents === 'string'
          ? [
              {
                role: 'user',
                parts: [{ text: promptOrContents.trim() }],
              },
            ]
          : promptOrContents,
    };

    if (options.systemInstruction && options.systemInstruction.trim()) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemInstruction.trim() }],
      };
    }

    if (
      options.temperature !== undefined ||
      options.topP !== undefined ||
      options.topK !== undefined ||
      options.maxOutputTokens !== undefined ||
      options.stopSequences !== undefined
    ) {
      requestBody.generationConfig = {
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.topP !== undefined && { topP: options.topP }),
        ...(options.topK !== undefined && { topK: options.topK }),
        ...(options.maxOutputTokens !== undefined && { maxOutputTokens: options.maxOutputTokens }),
        ...(options.stopSequences && { stopSequences: options.stopSequences }),
      };
    }

    // 5. Setup timeout abort controller chained with optional external signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort());
      }
    }

    const startTime = performance.now();
    let accumulatedText = '';
    let modelVersion = model;
    let finishReason: string | undefined;
    let usageMetadata: GeminiUsageMetadata | undefined;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // 6. Handle HTTP error status codes
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      // 7. If response body is not readable, fallback to standard generateText
      if (!response.body) {
        const fallbackPrompt =
          typeof promptOrContents === 'string'
            ? promptOrContents
            : promptOrContents[promptOrContents.length - 1]?.parts?.[0]?.text || '';

        const fallbackResult = await this.generateText(fallbackPrompt, options);
        options.onChunk?.(fallbackResult.text, fallbackResult.text);
        return {
          ...fallbackResult,
          isStreamed: false,
        };
      }

      // 8. Stream SSE chunks using ReadableStream reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const abortHandler = () => {
        reader.cancel().catch(() => {});
      };

      if (options.signal) {
        options.signal.addEventListener('abort', abortHandler);
      }

      try {
        while (true) {
          if (options.signal?.aborted) {
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const data: GeminiGenerateContentResponse = JSON.parse(jsonStr);

              // Check prompt safety block
              if (data.promptFeedback?.blockReason) {
                throw new GeminiSafetyBlockError(
                  `Request was blocked by Gemini (${data.promptFeedback.blockReason}).`,
                  data.promptFeedback.blockReason
                );
              }

              const candidate = data.candidates?.[0];
              if (candidate) {
                if (candidate.finishReason === 'SAFETY') {
                  throw new GeminiSafetyBlockError(
                    'Generation was halted due to Gemini safety restrictions.',
                    'SAFETY'
                  );
                }
                if (candidate.finishReason) {
                  finishReason = candidate.finishReason;
                }

                const chunkText = (candidate.content?.parts || [])
                  .map((p) => p.text || '')
                  .join('');

                if (chunkText) {
                  accumulatedText += chunkText;
                  options.onChunk?.(chunkText, accumulatedText);
                }
              }

              if (data.usageMetadata) {
                usageMetadata = data.usageMetadata;
              }
              if (data.modelVersion) {
                modelVersion = data.modelVersion;
              }
            } catch (jsonErr) {
              if (jsonErr instanceof GeminiError) throw jsonErr;
              // Ignore parse errors on heartbeat or partial frames
            }
          }
        }

        // Process leftover buffer
        if (buffer.trim().startsWith('data:')) {
          const jsonStr = buffer.trim().slice(5).trim();
          if (jsonStr) {
            try {
              const data: GeminiGenerateContentResponse = JSON.parse(jsonStr);
              const candidate = data.candidates?.[0];
              if (candidate?.content?.parts) {
                const chunkText = candidate.content.parts.map((p) => p.text || '').join('');
                if (chunkText) {
                  accumulatedText += chunkText;
                  options.onChunk?.(chunkText, accumulatedText);
                }
              }
            } catch {
              // Ignore
            }
          }
        }
      } catch (streamErr) {
        if (options.signal?.aborted) {
          return {
            text: accumulatedText,
            model: modelVersion || model,
            finishReason: 'USER_CANCELLED',
            usageMetadata,
            latencyMs: Math.round(performance.now() - startTime),
            isStreamed: true,
          };
        }
        throw streamErr;
      } finally {
        if (options.signal) {
          options.signal.removeEventListener('abort', abortHandler);
        }
        try {
          reader.releaseLock();
        } catch {
          // Ignore release errors if stream was cancelled
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);
      const finalFinishReason = options.signal?.aborted ? 'USER_CANCELLED' : finishReason || 'STOP';

      return {
        text: accumulatedText.trim(),
        model: modelVersion || model,
        finishReason: finalFinishReason,
        usageMetadata,
        latencyMs,
        isStreamed: true,
      };
    } catch (err: unknown) {
      if (options.signal?.aborted) {
        return {
          text: accumulatedText,
          model: modelVersion || model,
          finishReason: 'USER_CANCELLED',
          usageMetadata,
          latencyMs: Math.round(performance.now() - startTime),
          isStreamed: true,
        };
      }

      if (err instanceof GeminiError) {
        throw err;
      }

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new GeminiTimeoutError(timeoutMs);
        }
        if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
          throw new GeminiNetworkError();
        }
        throw new GeminiError(sanitizeApiError(err.message));
      }

      throw new GeminiNetworkError();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Helper to validate an API key with a minimal ping request.
   */
  public async validateApiKey(
    apiKey: string
  ): Promise<{ valid: boolean; latencyMs: number; error?: string }> {
    try {
      const result = await this.generateText("Respond with 'OK'", {
        apiKey,
        maxOutputTokens: 5,
        temperature: 0,
      });

      return {
        valid: true,
        latencyMs: result.latencyMs,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      return {
        valid: false,
        latencyMs: 0,
        error: message,
      };
    }
  }

  /**
   * Translates HTTP error responses into domain-specific GeminiError instances.
   */
  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status;
    let serverMessage = '';

    try {
      const errorJson: GeminiApiErrorResponse = await response.json();
      serverMessage = errorJson?.error?.message || '';
    } catch {
      serverMessage = response.statusText || '';
    }

    const cleanMsg = sanitizeApiError(serverMessage);

    if (status === 400) {
      if (
        cleanMsg.toLowerCase().includes('api key not valid') ||
        cleanMsg.toLowerCase().includes('invalid api key')
      ) {
        throw new GeminiAuthenticationError(cleanMsg || 'Invalid Gemini API key.');
      }
      throw new GeminiInvalidRequestError(cleanMsg || 'Invalid generation request parameters.');
    }

    if (status === 401 || status === 403) {
      throw new GeminiAuthenticationError(
        cleanMsg || 'Gemini API authentication failed. Please verify your API key.'
      );
    }

    if (status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

      if (
        cleanMsg.toLowerCase().includes('quota') ||
        cleanMsg.toLowerCase().includes('resource_exhausted')
      ) {
        throw new GeminiQuotaExceededError(
          cleanMsg || 'Gemini API quota exceeded for your project.'
        );
      }

      throw new GeminiRateLimitError(
        cleanMsg || 'Gemini rate limit exceeded. Please retry in a few seconds.',
        retrySeconds
      );
    }

    if (status >= 500) {
      throw new GeminiError(
        `Google Gemini service error (HTTP ${status}). Please try again later.`,
        'SERVER_ERROR',
        status
      );
    }

    throw new GeminiError(
      cleanMsg || `Gemini API call failed with HTTP status ${status}.`,
      'API_ERROR',
      status
    );
  }
}

export const geminiClient = new GeminiClient();
export default geminiClient;
