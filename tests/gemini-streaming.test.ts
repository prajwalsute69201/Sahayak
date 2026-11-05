import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  geminiClient,
  GeminiApiKeyMissingError,
  GeminiAuthenticationError,
  GeminiRateLimitError,
  GeminiSafetyBlockError,
  GeminiInvalidRequestError,
} from '@/services/gemini';
import { storageService } from '@/services/storage.service';
import { SETTINGS_STORAGE_KEY } from '@/types/settings.types';

function createMockSseStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event));
      }
      controller.close();
    },
  });
}

describe('Gemini Client Streaming Support (Slice 6)', () => {
  const originalFetch = globalThis.fetch;
  const mockApiKey = 'AIzaSyStreamingTestKey1234567890';

  beforeEach(async () => {
    await storageService.clear();
    await storageService.set(SETTINGS_STORAGE_KEY, { geminiApiKey: mockApiKey });
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Input Validation & Setup', () => {
    it('throws GeminiApiKeyMissingError when no key is available', async () => {
      await storageService.clear();
      await expect(geminiClient.generateStream('Hello')).rejects.toThrow(GeminiApiKeyMissingError);
    });

    it('throws GeminiInvalidRequestError on empty string or whitespace prompt', async () => {
      await expect(geminiClient.generateStream('')).rejects.toThrow(GeminiInvalidRequestError);
      await expect(geminiClient.generateStream('   ')).rejects.toThrow(GeminiInvalidRequestError);
    });

    it('throws GeminiInvalidRequestError on empty contents array', async () => {
      await expect(geminiClient.generateStream([])).rejects.toThrow(GeminiInvalidRequestError);
    });
  });

  describe('Successful Stream Generation & Chunk Processing', () => {
    it('streams response chunks incrementally and triggers onChunk callback', async () => {
      const sseChunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"Sahayak"}],"role":"model"}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":" is your"}],"role":"model"}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":" browser agent."}],"role":"model"},"finishReason":"STOP"}],"modelVersion":"gemini-2.0-flash-lite","usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":6,"totalTokenCount":11}}\n\n',
      ];

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        body: createMockSseStream(sseChunks),
      });
      globalThis.fetch = fetchMock;

      const receivedChunks: string[] = [];
      const receivedAggregations: string[] = [];

      const result = await geminiClient.generateStream('Introduce yourself', {
        onChunk: (chunk, fullText) => {
          receivedChunks.push(chunk);
          receivedAggregations.push(fullText);
        },
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = fetchMock.mock.calls[0][0];
      expect(url).toContain(':streamGenerateContent?alt=sse');

      expect(receivedChunks).toEqual(['Sahayak', ' is your', ' browser agent.']);
      expect(receivedAggregations).toEqual([
        'Sahayak',
        'Sahayak is your',
        'Sahayak is your browser agent.',
      ]);

      expect(result.text).toBe('Sahayak is your browser agent.');
      expect(result.finishReason).toBe('STOP');
      expect(result.isStreamed).toBe(true);
      expect(result.usageMetadata?.totalTokenCount).toBe(11);
    });

    it('handles fragmented SSE line buffers across stream chunks', async () => {
      // Chunk split in the middle of a line
      const fragmentedChunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"Frag',
        'ment 1"}],"role":"model"}}]}\n\ndata: {"candidates":[{"content":{"parts":[{"text":" and Fragment 2"}],"role":"model"},"finishReason":"STOP"}]}\n\n',
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createMockSseStream(fragmentedChunks),
      });

      const chunks: string[] = [];
      const result = await geminiClient.generateStream('Test fragmentation', {
        onChunk: (chunk) => chunks.push(chunk),
      });

      expect(chunks).toEqual(['Fragment 1', ' and Fragment 2']);
      expect(result.text).toBe('Fragment 1 and Fragment 2');
    });

    it('passes multi-turn contents array directly to streaming endpoint', async () => {
      const sseChunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"Sure, section 2 discusses XYZ."}],"role":"model"},"finishReason":"STOP"}]}\n\n',
      ];

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        body: createMockSseStream(sseChunks),
      });
      globalThis.fetch = fetchMock;

      const conversationHistory = [
        { role: 'user' as const, parts: [{ text: 'What is section 1?' }] },
        { role: 'model' as const, parts: [{ text: 'Section 1 introduces AI.' }] },
        { role: 'user' as const, parts: [{ text: 'What about section 2?' }] },
      ];

      const result = await geminiClient.generateStream(conversationHistory);

      expect(result.text).toBe('Sure, section 2 discusses XYZ.');
      const parsedBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(parsedBody.contents).toHaveLength(3);
      expect(parsedBody.contents[0].parts[0].text).toBe('What is section 1?');
    });
  });

  describe('Stream Cancellation & Partial Content Preservation', () => {
    it('stops stream when AbortSignal fires and preserves accumulated text without throwing', async () => {
      const abortController = new AbortController();

      const encoder = new TextEncoder();
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"candidates":[{"content":{"parts":[{"text":"Part 1 received"}],"role":"model"}}]}\n\n'
            )
          );
        },
        cancel() {
          // Stream cancelled
        },
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: mockStream,
      });

      const receivedChunks: string[] = [];
      const result = await geminiClient.generateStream('Long prompt', {
        signal: abortController.signal,
        onChunk: (chunk) => {
          receivedChunks.push(chunk);
          abortController.abort();
        },
      });

      expect(receivedChunks).toEqual(['Part 1 received']);
      expect(result.text).toBe('Part 1 received');
      expect(result.finishReason).toBe('USER_CANCELLED');
    });
  });

  describe('Error Handling & Safety Blocks', () => {
    it('throws GeminiSafetyBlockError when blocked by safety filters', async () => {
      const safetyChunk =
        'data: {"candidates":[{"finishReason":"SAFETY","content":{"parts":[]}}]}\n\n';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createMockSseStream([safetyChunk]),
      });

      await expect(geminiClient.generateStream('Hazardous prompt')).rejects.toThrow(
        GeminiSafetyBlockError
      );
    });

    it('translates HTTP 401 error into GeminiAuthenticationError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'API key not valid' },
        }),
      });

      await expect(geminiClient.generateStream('Test prompt')).rejects.toThrow(
        GeminiAuthenticationError
      );
    });

    it('translates HTTP 429 error into GeminiRateLimitError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '5' }),
        json: async () => ({
          error: { message: 'Rate limit exceeded' },
        }),
      });

      await expect(geminiClient.generateStream('Test prompt')).rejects.toThrow(
        GeminiRateLimitError
      );
    });

    it('falls back to standard generateText when response.body is unavailable', async () => {
      const fetchMock = vi
        .fn()
        // First call to stream endpoint returns response without body
        .mockResolvedValueOnce({
          ok: true,
          body: null,
        })
        // Second call (generateText fallback) returns valid JSON
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: { parts: [{ text: 'Fallback response text' }] },
                finishReason: 'STOP',
              },
            ],
          }),
        });

      globalThis.fetch = fetchMock;

      const receivedChunks: string[] = [];
      const result = await geminiClient.generateStream('Test fallback', {
        onChunk: (chunk) => receivedChunks.push(chunk),
      });

      expect(result.text).toBe('Fallback response text');
      expect(result.isStreamed).toBe(false);
      expect(receivedChunks).toEqual(['Fallback response text']);
    });
  });
});
