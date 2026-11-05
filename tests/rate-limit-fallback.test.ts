import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  aiProviderManager,
  retryService,
  geminiProvider,
  groqProvider,
  groqClient,
  AIRateLimitError,
  AIQuotaExceededError,
  AIAuthenticationError,
  AIInvalidRequestError,
  AIServerError,
  AICapabilityError,
  AICascadeExhaustedError,
  AIStreamRequest,
  sanitizeApiKey,
  RETRY_CONFIG,
} from '@/services/ai';
import { storageService } from '@/services/storage.service';
import { SETTINGS_STORAGE_KEY } from '@/types/settings.types';

describe('Rate-Limit Resilience & Groq Fallback Cascade (Slice 9)', () => {
  const mockGeminiKey = 'AIzaSyGeminiTestKey1234567890abcdefg';
  const mockGroqKey = 'gsk_groqTestKey1234567890abcdefghijklmnopqrstuv';

  beforeEach(async () => {
    vi.clearAllMocks();
    await storageService.clear();
    await storageService.set(SETTINGS_STORAGE_KEY, {
      geminiApiKey: mockGeminiKey,
      groqApiKey: mockGroqKey,
      primaryProvider: 'gemini',
      enableFallback: true,
      geminiModel: 'gemini-2.0-flash-lite',
      groqModel: 'llama-3.3-70b-versatile',
      language: 'en',
    });
  });

  afterEach(() => {
    // Keep global mocks intact
  });

  /* -------------------------------------------------------------------------
   * A. Retry Logic, Exponential Backoff & Retry-After Handling
   * ------------------------------------------------------------------------- */
  describe('Retry Service & Backoff Calculations', () => {
    it('calculates exponential backoff with jitter within bounded limits', () => {
      // Attempt 0: 1500 * 2^0 = 1500ms ± 300ms => [1200, 1800]
      const delay0 = retryService.calculateBackoff(0);
      expect(delay0).toBeGreaterThanOrEqual(1200);
      expect(delay0).toBeLessThanOrEqual(1800);

      // Attempt 1: 1500 * 2^1 = 3000ms ± 300ms => [2700, 3300]
      const delay1 = retryService.calculateBackoff(1);
      expect(delay1).toBeGreaterThanOrEqual(2700);
      expect(delay1).toBeLessThanOrEqual(3300);

      // Attempt 5: Bounded by maxDelayMs (10,000ms)
      const delay5 = retryService.calculateBackoff(5);
      expect(delay5).toBeLessThanOrEqual(RETRY_CONFIG.maxDelayMs);
    });

    it('parses numeric and HTTP-date Retry-After headers accurately', () => {
      // Numeric seconds
      expect(retryService.parseRetryAfter('5')).toBe(5000);
      expect(retryService.parseRetryAfter('2.5')).toBe(2500);
      expect(retryService.parseRetryAfter('0')).toBe(0);
      expect(retryService.parseRetryAfter(null)).toBeUndefined();
      expect(retryService.parseRetryAfter('')).toBeUndefined();

      // HTTP-date in the future
      const futureDate = new Date(Date.now() + 8000).toUTCString();
      const parsedMs = retryService.parseRetryAfter(futureDate);
      expect(parsedMs).toBeGreaterThan(0);
      expect(parsedMs).toBeLessThanOrEqual(9000);
    });

    it('uses Retry-After header in calculateBackoff when provided', () => {
      const delay = retryService.calculateBackoff(0, 4000);
      expect(delay).toBe(4000);

      // Capped by maxDelayMs
      const capped = retryService.calculateBackoff(0, 25000);
      expect(capped).toBe(RETRY_CONFIG.maxDelayMs);
    });

    it('correctly classifies retryable vs permanent errors', () => {
      // Retryable
      expect(retryService.isRetryableError(new AIRateLimitError('Rate limited', 'gemini'))).toBe(
        true
      );
      expect(
        retryService.isRetryableError(new AIServerError('Service unavailable', 'gemini', 503))
      ).toBe(true);
      expect(retryService.isRetryableError(new Error('Network error fetch failed'))).toBe(true);

      // Non-retryable
      expect(
        retryService.isRetryableError(new AIQuotaExceededError('Quota exceeded', 'gemini'))
      ).toBe(false);
      expect(
        retryService.isRetryableError(new AIAuthenticationError('Invalid key', 'gemini'))
      ).toBe(false);
      expect(retryService.isRetryableError(new AIInvalidRequestError('Bad prompt', 'gemini'))).toBe(
        false
      );
      expect(retryService.isRetryableError(new AICapabilityError('groq', 'multimodal'))).toBe(
        false
      );

      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      expect(retryService.isRetryableError(abortErr)).toBe(false);
    });

    it('retries up to maxRetries on transient errors and stops', async () => {
      let attempts = 0;
      vi.spyOn(
        retryService as unknown as { delayWithSignal: () => Promise<void> },
        'delayWithSignal'
      ).mockResolvedValue(undefined);

      await expect(
        retryService.executeWithRetry(
          async () => {
            attempts++;
            throw new AIRateLimitError('Rate limit', 'gemini');
          },
          { maxRetries: 2 }
        )
      ).rejects.toThrow(AIRateLimitError);

      // Initial attempt (0) + 2 retries (1, 2) = 3 total invocations
      expect(attempts).toBe(3);
    });

    it('does not retry permanent authentication errors', async () => {
      let attempts = 0;

      await expect(
        retryService.executeWithRetry(
          async () => {
            attempts++;
            throw new AIAuthenticationError('Invalid key', 'gemini');
          },
          { maxRetries: 2 }
        )
      ).rejects.toThrow(AIAuthenticationError);

      expect(attempts).toBe(1);
    });
  });

  /* -------------------------------------------------------------------------
   * B. Groq Client & API Integration
   * ------------------------------------------------------------------------- */
  describe('Groq Client & Response Normalization', () => {
    it('generates text completion from Groq and normalizes response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-123',
            model: 'llama-3.3-70b-versatile',
            choices: [
              {
                message: { role: 'assistant', content: 'Groq response text.' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 12, completion_tokens: 6, total_tokens: 18 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const result = await groqClient.generateText('Explain photosynthesis', {
        prompt: 'Explain photosynthesis',
        apiKey: mockGroqKey,
      });

      expect(result.text).toBe('Groq response text.');
      expect(result.provider).toBe('groq');
      expect(result.model).toBe('llama-3.3-70b-versatile');
      expect(result.finishReason).toBe('stop');
      expect(result.usage?.totalTokens).toBe(18);
      expect(result.isStreamed).toBe(false);
    });

    it('streams Groq SSE chunks in real-time', async () => {
      const ssePayload = [
        'data: {"id":"1","choices":[{"delta":{"content":"Groq "},"finish_reason":null}]}',
        'data: {"id":"1","choices":[{"delta":{"content":"streams "},"finish_reason":null}]}',
        'data: {"id":"1","choices":[{"delta":{"content":"fast."},"finish_reason":"stop"}]}',
        'data: [DONE]',
      ].join('\n\n');

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ssePayload));
          controller.close();
        },
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
      );

      const chunks: string[] = [];
      const result = await groqClient.generateStream('Stream test', {
        prompt: 'Stream test',
        apiKey: mockGroqKey,
        onChunk: (chunk: string) => chunks.push(chunk),
      });

      expect(result.text).toBe('Groq streams fast.');
      expect(result.provider).toBe('groq');
      expect(chunks).toEqual(['Groq ', 'streams ', 'fast.']);
      expect(result.isStreamed).toBe(true);
    });

    it('validates a Groq API key via ping request', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const ping = await groqClient.validateApiKey(mockGroqKey);
      expect(ping.valid).toBe(true);
      expect(ping.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('maps Groq HTTP 429 to AIRateLimitError with Retry-After', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Rate limit reached' } }), {
          status: 429,
          headers: new Headers({ 'Retry-After': '3' }),
        })
      );

      try {
        await groqClient.generateText('Test prompt', {
          prompt: 'Test prompt',
          apiKey: mockGroqKey,
        });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AIRateLimitError);
        expect((err as AIRateLimitError).retryAfterMs).toBe(3000);
        expect((err as AIRateLimitError).provider).toBe('groq');
      }
    });

    it('sanitizes Groq API keys in error messages', () => {
      const dirty = `Failed call with gsk_abcdef123456789012345678901234567890 and Bearer gsk_secret`;
      const clean = sanitizeApiKey(dirty);
      expect(clean).not.toContain('gsk_abcdef');
      expect(clean).toContain('[REDACTED_GROQ_KEY]');
    });
  });

  /* -------------------------------------------------------------------------
   * C. Automatic Fallback Cascade
   * ------------------------------------------------------------------------- */
  describe('Automatic Fallback Cascade Flow', () => {
    it('uses primary Gemini provider when request succeeds', async () => {
      vi.spyOn(geminiProvider, 'generateText').mockResolvedValue({
        text: 'Gemini direct answer.',
        provider: 'gemini',
        model: 'gemini-2.0-flash-lite',
        latencyMs: 150,
      });

      const fallbackSpy = vi.spyOn(groqProvider, 'generateText');

      const result = await aiProviderManager.generateText('What is an operating system?');

      expect(result.text).toBe('Gemini direct answer.');
      expect(result.provider).toBe('gemini');
      expect(result.fallbackTriggered).toBe(false);
      expect(fallbackSpy).not.toHaveBeenCalled();
    });

    it('cascades to Groq when Gemini encounters quota exhaustion (HTTP 429)', async () => {
      vi.spyOn(geminiProvider, 'generateText').mockRejectedValue(
        new AIQuotaExceededError('Resource has been exhausted (quota exceeded)', 'gemini')
      );

      vi.spyOn(groqProvider, 'generateText').mockResolvedValue({
        text: 'Groq fallback answer.',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        latencyMs: 80,
      });

      const result = await aiProviderManager.generateText('Explain quantum mechanics');

      expect(result.text).toBe('Groq fallback answer.');
      expect(result.provider).toBe('groq');
      expect(result.fallbackTriggered).toBe(true);
      expect(result.fallbackReason).toContain('Resource has been exhausted');
    });

    it('retries Gemini on transient rate limit, then falls back to Groq if still failing', async () => {
      vi.spyOn(
        retryService as unknown as { delayWithSignal: () => Promise<void> },
        'delayWithSignal'
      ).mockResolvedValue(undefined);

      let geminiCalls = 0;
      vi.spyOn(geminiProvider, 'generateText').mockImplementation(async () => {
        geminiCalls++;
        throw new AIRateLimitError('Rate limit exceeded', 'gemini');
      });

      vi.spyOn(groqProvider, 'generateText').mockResolvedValue({
        text: 'Groq answer after Gemini retries exhausted.',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        latencyMs: 95,
      });

      const result = await aiProviderManager.generateText('Explain compilers');

      // Initial call + 2 retries = 3 calls on Gemini
      expect(geminiCalls).toBe(3);
      expect(result.text).toBe('Groq answer after Gemini retries exhausted.');
      expect(result.provider).toBe('groq');
      expect(result.fallbackTriggered).toBe(true);
    });

    it('does not trigger fallback when enableFallback is set to false in settings', async () => {
      await storageService.set(SETTINGS_STORAGE_KEY, {
        geminiApiKey: mockGeminiKey,
        groqApiKey: mockGroqKey,
        enableFallback: false,
      });

      vi.spyOn(geminiProvider, 'generateText').mockRejectedValue(
        new AIQuotaExceededError('Quota exceeded', 'gemini')
      );

      const groqSpy = vi.spyOn(groqProvider, 'generateText');

      await expect(aiProviderManager.generateText('Explain databases')).rejects.toThrow(
        AIQuotaExceededError
      );

      expect(groqSpy).not.toHaveBeenCalled();
    });

    it('does not trigger fallback when Groq API key is not configured', async () => {
      await storageService.set(SETTINGS_STORAGE_KEY, {
        geminiApiKey: mockGeminiKey,
        groqApiKey: '', // Empty Groq key
        enableFallback: true,
      });

      vi.spyOn(geminiProvider, 'generateText').mockRejectedValue(
        new AIQuotaExceededError('Quota exceeded', 'gemini')
      );

      vi.spyOn(groqProvider, 'generateText').mockRejectedValue(
        new AIAuthenticationError('Groq API key is not configured', 'groq')
      );

      await expect(aiProviderManager.generateText('Explain databases')).rejects.toThrow(
        AICascadeExhaustedError
      );
    });

    it('throws AICascadeExhaustedError when both Gemini and Groq fail', async () => {
      vi.spyOn(geminiProvider, 'generateText').mockRejectedValue(
        new AIQuotaExceededError('Gemini quota reached', 'gemini')
      );

      vi.spyOn(groqProvider, 'generateText').mockRejectedValue(
        new AIServerError('Groq 503 Outage', 'groq')
      );

      try {
        await aiProviderManager.generateText('Explain networking');
        expect.unreachable('Should have thrown cascade error');
      } catch (err) {
        expect(err).toBeInstanceOf(AICascadeExhaustedError);
        const cascade = err as AICascadeExhaustedError;
        expect(cascade.primaryProvider).toBe('gemini');
        expect(cascade.primaryError.message).toContain('Gemini quota reached');
        expect(cascade.fallbackProvider).toBe('groq');
        expect(cascade.fallbackError?.message).toContain('Groq 503 Outage');
      }
    });

    it('does not trigger fallback on non-retryable user input errors', async () => {
      vi.spyOn(geminiProvider, 'generateText').mockRejectedValue(
        new AIInvalidRequestError('Prompt must be a non-empty string.', 'gemini')
      );

      const groqSpy = vi.spyOn(groqProvider, 'generateText');

      await expect(aiProviderManager.generateText('')).rejects.toThrow(AIInvalidRequestError);

      expect(groqSpy).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------
   * D. Streaming Fallback & Multimodal Capability Routing
   * ------------------------------------------------------------------------- */
  describe('Streaming Fallback & Multimodal Capability Routing', () => {
    it('cascades to Groq stream if primary Gemini fails before emitting chunks', async () => {
      vi.spyOn(geminiProvider, 'generateStream').mockRejectedValue(
        new AIQuotaExceededError('Quota exceeded', 'gemini')
      );

      vi.spyOn(groqProvider, 'generateStream').mockImplementation(
        async (request: AIStreamRequest) => {
          request.onChunk?.('Groq streaming chunk.', 'Groq streaming chunk.');
          return {
            text: 'Groq streaming chunk.',
            provider: 'groq',
            model: 'llama-3.3-70b-versatile',
            latencyMs: 110,
            isStreamed: true,
          };
        }
      );

      const chunks: string[] = [];
      const result = await aiProviderManager.generateStream('Stream query', {
        onChunk: (chunk: string) => chunks.push(chunk),
      });

      expect(result.provider).toBe('groq');
      expect(result.fallbackTriggered).toBe(true);
      expect(chunks).toEqual(['Groq streaming chunk.']);
    });

    it('does not restart stream on fallback provider if chunks were already emitted', async () => {
      vi.spyOn(geminiProvider, 'generateStream').mockImplementation(
        async (request: AIStreamRequest) => {
          request.onChunk?.('Initial partial words ', 'Initial partial words ');
          throw new AIServerError('Stream connection broke midway', 'gemini');
        }
      );

      const groqSpy = vi.spyOn(groqProvider, 'generateStream');

      await expect(
        aiProviderManager.generateStream('Stream query', {
          onChunk: () => {},
        })
      ).rejects.toThrow(AIServerError);

      expect(groqSpy).not.toHaveBeenCalled();
    });

    it('rejects Groq multimodal requests with AICapabilityError since Groq is text-only', async () => {
      await expect(
        groqProvider.generateMultimodal({
          prompt: 'What is in this image?',
          images: [{ mimeType: 'image/png', data: 'mock' }],
        })
      ).rejects.toThrow(AICapabilityError);
    });

    it('routes multimodal vision requests to Gemini and does not fallback to text-only Groq', async () => {
      vi.spyOn(geminiProvider, 'generateMultimodal').mockRejectedValue(
        new AIQuotaExceededError('Gemini vision quota exhausted', 'gemini')
      );

      const groqSpy = vi.spyOn(groqProvider, 'generateMultimodal');

      await expect(
        aiProviderManager.generateMultimodal({
          prompt: 'Analyze chart',
          images: [{ mimeType: 'image/png', data: 'mock' }],
        })
      ).rejects.toThrow('Gemini vision quota exhausted');

      expect(groqSpy).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------
   * E. Provider Configuration & Status
   * ------------------------------------------------------------------------- */
  describe('Provider Selection & Status', () => {
    it('respects user configured primary provider when Groq is primary', async () => {
      await storageService.set(SETTINGS_STORAGE_KEY, {
        geminiApiKey: mockGeminiKey,
        groqApiKey: mockGroqKey,
        primaryProvider: 'groq',
        enableFallback: true,
      });

      vi.spyOn(groqProvider, 'generateText').mockResolvedValue({
        text: 'Groq primary answer.',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        latencyMs: 75,
      });

      const geminiSpy = vi.spyOn(geminiProvider, 'generateText');

      const result = await aiProviderManager.generateText('Tell me a joke');

      expect(result.provider).toBe('groq');
      expect(result.text).toBe('Groq primary answer.');
      expect(geminiSpy).not.toHaveBeenCalled();
    });

    it('retrieves provider status correctly', async () => {
      const geminiStatus = await aiProviderManager.getProviderStatus('gemini');
      expect(geminiStatus).not.toBeNull();
      expect(geminiStatus?.provider).toBe('gemini');
      expect(geminiStatus?.isConfigured).toBe(true);
      expect(geminiStatus?.capabilities.multimodal).toBe(true);

      const groqStatus = await aiProviderManager.getProviderStatus('groq');
      expect(groqStatus).not.toBeNull();
      expect(groqStatus?.provider).toBe('groq');
      expect(groqStatus?.isConfigured).toBe(true);
      expect(groqStatus?.capabilities.multimodal).toBe(false);
    });
  });
});
