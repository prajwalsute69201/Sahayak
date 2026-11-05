import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GeminiClient,
  geminiClient,
  GeminiApiKeyMissingError,
  GeminiAuthenticationError,
  GeminiRateLimitError,
  GeminiQuotaExceededError,
  GeminiNetworkError,
  GeminiTimeoutError,
  GeminiSafetyBlockError,
  GeminiInvalidRequestError,
  sanitizeApiError,
} from '@/services/gemini';
import { storageService } from '@/services/storage.service';
import { SETTINGS_STORAGE_KEY } from '@/types/settings.types';

describe('Gemini API Client & Text Call (Slice 2)', () => {
  const originalFetch = globalThis.fetch;
  const mockApiKey = 'AIzaSyTestKey1234567890abcdefghijklm';

  beforeEach(async () => {
    await storageService.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('API Key Resolution & Input Validation', () => {
    it('throws GeminiApiKeyMissingError when no key is in storage or options', async () => {
      await expect(geminiClient.generateText('Hello')).rejects.toThrow(GeminiApiKeyMissingError);
    });

    it('throws GeminiInvalidRequestError when prompt is empty or whitespace', async () => {
      await storageService.set(SETTINGS_STORAGE_KEY, { geminiApiKey: mockApiKey });

      await expect(geminiClient.generateText('')).rejects.toThrow(GeminiInvalidRequestError);
      await expect(geminiClient.generateText('   \n  \t  ')).rejects.toThrow(
        GeminiInvalidRequestError
      );
    });

    it('uses explicit apiKey override when provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Response' }] }, finishReason: 'STOP' }],
        }),
      });
      globalThis.fetch = fetchMock;

      await geminiClient.generateText('Hello', { apiKey: 'override-key-xyz' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['x-goog-api-key']).toBe('override-key-xyz');
    });

    it('uses stored API key from storageService by default', async () => {
      await storageService.set(SETTINGS_STORAGE_KEY, { geminiApiKey: mockApiKey });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Response' }] }, finishReason: 'STOP' }],
        }),
      });
      globalThis.fetch = fetchMock;

      await geminiClient.generateText('Hello');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['x-goog-api-key']).toBe(mockApiKey);
    });
  });

  describe('Successful Text Generation', () => {
    it('generates text and returns clean structured result', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello, I am Sahayak AI assistant!' }],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
          },
        ],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 10,
          totalTokenCount: 15,
        },
        modelVersion: 'gemini-2.0-flash-lite-001',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await geminiClient.generateText('Say hello', { apiKey: mockApiKey });

      expect(result.text).toBe('Hello, I am Sahayak AI assistant!');
      expect(result.model).toBe('gemini-2.0-flash-lite-001');
      expect(result.finishReason).toBe('STOP');
      expect(result.usageMetadata?.totalTokenCount).toBe(15);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('passes generationConfig and systemInstruction correctly in payload', async () => {
      let capturedBody: {
        contents: Array<{ parts: Array<{ text: string }> }>;
        systemInstruction?: { parts: Array<{ text: string }> };
        generationConfig?: Record<string, unknown>;
      } | null = null;
      globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
        capturedBody = JSON.parse(init.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'OK' }] } }],
          }),
        });
      });

      await geminiClient.generateText('Explain extensions', {
        apiKey: mockApiKey,
        model: 'gemini-2.0-flash',
        temperature: 0.2,
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 250,
        stopSequences: ['END'],
        systemInstruction: 'Respond only in bullet points.',
      });

      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.contents[0].parts[0].text).toBe('Explain extensions');
      expect(capturedBody!.systemInstruction?.parts[0].text).toBe('Respond only in bullet points.');
      expect(capturedBody!.generationConfig).toEqual({
        temperature: 0.2,
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 250,
        stopSequences: ['END'],
      });
    });
  });

  describe('Error Handling & HTTP Status Code Mapping', () => {
    it('maps HTTP 400 invalid API key to GeminiAuthenticationError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'API key not valid. Please pass a valid API key.' },
        }),
      });

      await expect(geminiClient.generateText('Test', { apiKey: 'invalid-key' })).rejects.toThrow(
        GeminiAuthenticationError
      );
    });

    it('maps HTTP 403 to GeminiAuthenticationError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: { message: 'The caller does not have permission' },
        }),
      });

      await expect(geminiClient.generateText('Test', { apiKey: mockApiKey })).rejects.toThrow(
        GeminiAuthenticationError
      );
    });

    it('maps HTTP 429 rate limit to GeminiRateLimitError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '5' }),
        json: async () => ({
          error: { message: 'Resource has been exhausted (rate limit).' },
        }),
      });

      try {
        await geminiClient.generateText('Test', { apiKey: mockApiKey });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(GeminiRateLimitError);
        expect((err as GeminiRateLimitError).retryAfterSeconds).toBe(5);
      }
    });

    it('maps HTTP 429 quota exhaustion to GeminiQuotaExceededError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers(),
        json: async () => ({
          error: { message: 'Quota exceeded for quota metric GenerateContentRequests' },
        }),
      });

      await expect(geminiClient.generateText('Test', { apiKey: mockApiKey })).rejects.toThrow(
        GeminiQuotaExceededError
      );
    });

    it('detects SAFETY block in candidates and throws GeminiSafetyBlockError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: 'SAFETY',
              safetyRatings: [{ category: 'HARM_CATEGORY_DANGEROUS', probability: 'HIGH' }],
            },
          ],
        }),
      });

      await expect(
        geminiClient.generateText('Harmful prompt', { apiKey: mockApiKey })
      ).rejects.toThrow(GeminiSafetyBlockError);
    });

    it('detects prompt-level blockReason and throws GeminiSafetyBlockError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          promptFeedback: {
            blockReason: 'SAFETY',
          },
        }),
      });

      await expect(
        geminiClient.generateText('Blocked prompt', { apiKey: mockApiKey })
      ).rejects.toThrow(GeminiSafetyBlockError);
    });

    it('handles network failure by throwing GeminiNetworkError', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(geminiClient.generateText('Test', { apiKey: mockApiKey })).rejects.toThrow(
        GeminiNetworkError
      );
    });

    it('handles timeout by throwing GeminiTimeoutError', async () => {
      const client = new GeminiClient();
      globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      await expect(
        client.generateText('Test', { apiKey: mockApiKey, timeoutMs: 10 })
      ).rejects.toThrow(GeminiTimeoutError);
    });
  });

  describe('Security & API Key Sanitization', () => {
    it('redacts sensitive API keys from error messages', () => {
      const sensitiveMsg = `Failed request to https://generativelanguage.googleapis.com?key=${mockApiKey} with error`;
      const sanitized = sanitizeApiError(sensitiveMsg);

      expect(sanitized).not.toContain(mockApiKey);
      expect(sanitized).toContain('[REDACTED_API_KEY]');
    });

    it('never leaks API key in thrown GeminiError message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: `Key ${mockApiKey} is invalid` },
        }),
      });

      try {
        await geminiClient.generateText('Test', { apiKey: mockApiKey });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        const error = err as Error;
        expect(error.message).not.toContain(mockApiKey);
        expect(error.message).toContain('[REDACTED_API_KEY]');
      }
    });
  });

  describe('validateApiKey Helper', () => {
    it('returns valid: true on successful test ping', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        }),
      });

      const res = await geminiClient.validateApiKey(mockApiKey);
      expect(res.valid).toBe(true);
      expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('returns valid: false with clear error message on failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: { message: 'Invalid API key' },
        }),
      });

      const res = await geminiClient.validateApiKey('bad-key');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
