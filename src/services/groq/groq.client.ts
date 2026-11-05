/**
 * Groq REST API Client for Sahayak
 * Direct, zero-SDK communication with Groq Cloud OpenAI-compatible endpoints.
 */

import { storageService } from '@/services/storage.service';
import { SETTINGS_STORAGE_KEY, UserSettings } from '@/types/settings.types';
import {
  AIGenerateRequest,
  AIStreamRequest,
  AINormalizedResult,
  AIKeyValidationResult,
} from '../ai/ai-provider.types';
import {
  AIProviderError,
  AIRateLimitError,
  AIQuotaExceededError,
  AIAuthenticationError,
  AIInvalidRequestError,
  AIServerError,
  AINetworkError,
  AITimeoutError,
  sanitizeApiKey,
} from '../ai/errors/provider.errors';
import { retryService } from '../ai/retry.service';
import {
  GroqChatCompletionRequest,
  GroqChatCompletionResponse,
  GroqChatMessage,
  GroqStreamChunk,
  GroqErrorResponse,
} from './groq.types';

export class GroqClient {
  public static readonly BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
  public static readonly DEFAULT_MODEL = 'llama-3.3-70b-versatile';
  private static readonly DEFAULT_TIMEOUT_MS = 30000;

  /**
   * Resolves the Groq API key from request options or local storage.
   */
  public async resolveApiKey(overrideKey?: string): Promise<string> {
    if (overrideKey && overrideKey.trim().length > 0) {
      return overrideKey.trim();
    }

    const settings = await storageService.get<UserSettings>(SETTINGS_STORAGE_KEY);
    const key = settings?.groqApiKey?.trim();

    if (!key) {
      throw new AIAuthenticationError(
        'Groq API key is not configured. Please add your key in Sahayak Settings.',
        'groq'
      );
    }

    return key;
  }

  /**
   * Generates a non-streaming text completion from Groq.
   */
  public async generateText(
    prompt: string,
    options: AIGenerateRequest = { prompt }
  ): Promise<AINormalizedResult> {
    const trimmedPrompt = (prompt || options.prompt || '').trim();
    if (!trimmedPrompt) {
      throw new AIInvalidRequestError('Prompt must be a non-empty string.', 'groq');
    }

    const apiKey = await this.resolveApiKey(options.apiKey);
    const model = options.model || GroqClient.DEFAULT_MODEL;
    const timeoutMs = options.timeoutMs ?? GroqClient.DEFAULT_TIMEOUT_MS;

    const messages: GroqChatMessage[] = [];
    if (options.systemInstruction && options.systemInstruction.trim()) {
      messages.push({
        role: 'system',
        content: options.systemInstruction.trim(),
      });
    }
    messages.push({
      role: 'user',
      content: trimmedPrompt,
    });

    const requestBody: GroqChatCompletionRequest = {
      model,
      messages,
      stream: false,
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
      ...(options.topP !== undefined && { top_p: options.topP }),
      ...(options.stopSequences && { stop: options.stopSequences }),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    const startTime = performance.now();

    try {
      const response = await fetch(GroqClient.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data: GroqChatCompletionResponse = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        throw new AIProviderError('Groq returned empty candidates for this prompt.', 'groq');
      }

      return {
        text: (choice.message?.content || '').trim(),
        provider: 'groq',
        model: data.model || model,
        finishReason: choice.finish_reason,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        latencyMs,
        isStreamed: false,
      };
    } catch (err: unknown) {
      if (err instanceof AIProviderError) throw err;

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new AITimeoutError('groq', timeoutMs);
        }
        if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
          throw new AINetworkError('groq');
        }
        throw new AIProviderError(sanitizeApiKey(err.message), 'groq');
      }

      throw new AINetworkError('groq');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generates a streaming completion from Groq via Server-Sent Events.
   */
  public async generateStream(
    promptOrMessages: string | GroqChatMessage[],
    options: AIStreamRequest = {
      prompt: typeof promptOrMessages === 'string' ? promptOrMessages : '',
    }
  ): Promise<AINormalizedResult> {
    const apiKey = await this.resolveApiKey(options.apiKey);
    const model = options.model || GroqClient.DEFAULT_MODEL;
    const timeoutMs = options.timeoutMs ?? GroqClient.DEFAULT_TIMEOUT_MS;

    const messages: GroqChatMessage[] = [];

    if (typeof promptOrMessages === 'string') {
      const trimmed = promptOrMessages.trim();
      if (!trimmed) {
        throw new AIInvalidRequestError('Prompt must be a non-empty string.', 'groq');
      }
      if (options.systemInstruction && options.systemInstruction.trim()) {
        messages.push({
          role: 'system',
          content: options.systemInstruction.trim(),
        });
      }
      messages.push({ role: 'user', content: trimmed });
    } else if (Array.isArray(promptOrMessages)) {
      if (promptOrMessages.length === 0) {
        throw new AIInvalidRequestError('Messages array cannot be empty.', 'groq');
      }
      messages.push(...promptOrMessages);
    }

    const requestBody: GroqChatCompletionRequest = {
      model,
      messages,
      stream: true,
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
      ...(options.topP !== undefined && { top_p: options.topP }),
      ...(options.stopSequences && { stop: options.stopSequences }),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    const startTime = performance.now();
    let accumulatedText = '';
    let finishReason: string | undefined;

    try {
      const response = await fetch(GroqClient.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      if (!response.body) {
        throw new AIProviderError('Groq response body is empty or stream unavailable.', 'groq');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              finishReason = finishReason || 'stop';
              continue;
            }

            try {
              const chunk: GroqStreamChunk = JSON.parse(dataStr);
              const choice = chunk.choices?.[0];
              if (choice?.delta?.content) {
                const delta = choice.delta.content;
                accumulatedText += delta;
                options.onChunk?.(delta, accumulatedText);
              }
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason;
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      return {
        text: accumulatedText.trim(),
        provider: 'groq',
        model,
        finishReason: finishReason || 'stop',
        latencyMs: Math.round(performance.now() - startTime),
        isStreamed: true,
      };
    } catch (err: unknown) {
      // If user cancelled, return partial text gracefully
      if (options.signal?.aborted) {
        return {
          text: accumulatedText.trim(),
          provider: 'groq',
          model,
          finishReason: 'USER_CANCELLED',
          latencyMs: Math.round(performance.now() - startTime),
          isStreamed: true,
        };
      }

      if (err instanceof AIProviderError) throw err;

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new AITimeoutError('groq', timeoutMs);
        }
        if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
          throw new AINetworkError('groq');
        }
        throw new AIProviderError(sanitizeApiKey(err.message), 'groq');
      }

      throw new AINetworkError('groq');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Validates a Groq API key via a minimal ping request.
   */
  public async validateApiKey(apiKey: string): Promise<AIKeyValidationResult> {
    try {
      const result = await this.generateText("Respond with 'OK'", {
        prompt: "Respond with 'OK'",
        apiKey,
        maxTokens: 5,
        temperature: 0,
      });

      return {
        valid: true,
        latencyMs: result.latencyMs,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Groq connection failed.';
      return {
        valid: false,
        latencyMs: 0,
        error: message,
      };
    }
  }

  /**
   * Translates HTTP error responses into typed AIProviderError instances.
   */
  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status;
    let serverMessage = '';

    try {
      const errorJson: GroqErrorResponse = await response.json();
      serverMessage = errorJson?.error?.message || '';
    } catch {
      serverMessage = response.statusText || '';
    }

    const cleanMsg = sanitizeApiKey(serverMessage);

    if (status === 400) {
      if (
        cleanMsg.toLowerCase().includes('invalid api key') ||
        cleanMsg.toLowerCase().includes('api key not valid')
      ) {
        throw new AIAuthenticationError(cleanMsg || 'Invalid Groq API key.', 'groq', 401);
      }
      throw new AIInvalidRequestError(cleanMsg || 'Invalid Groq request parameters.', 'groq');
    }

    if (status === 401 || status === 403) {
      throw new AIAuthenticationError(
        cleanMsg || 'Groq authentication failed. Please verify your Groq API key.',
        'groq',
        status
      );
    }

    if (status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterMs = retryService.parseRetryAfter(retryAfterHeader);

      if (
        cleanMsg.toLowerCase().includes('quota') ||
        cleanMsg.toLowerCase().includes('insufficient_quota')
      ) {
        throw new AIQuotaExceededError(cleanMsg || 'Groq quota exceeded for your project.', 'groq');
      }

      throw new AIRateLimitError(
        cleanMsg || 'Groq rate limit exceeded. Please retry in a moment.',
        'groq',
        retryAfterMs
      );
    }

    if (status >= 500) {
      throw new AIServerError(
        `Groq service outage (HTTP ${status}). Please try again later.`,
        'groq',
        status
      );
    }

    throw new AIProviderError(
      cleanMsg || `Groq request failed with HTTP ${status}.`,
      'groq',
      'API_ERROR',
      status
    );
  }
}

export const groqClient = new GroqClient();
export default groqClient;
