/**
 * Gemini AI Provider Implementation
 * Adapts GeminiClient to the common AIProvider interface.
 */

import { AIProvider } from '../ai/ai-provider.interface';
import {
  AIProviderName,
  AICapabilities,
  AIGenerateRequest,
  AIStreamRequest,
  AIMultimodalRequest,
  AINormalizedResult,
  AIKeyValidationResult,
  AIChatMessage,
} from '../ai/ai-provider.types';
import { GEMINI_CONFIG } from '../ai/ai-provider.config';
import { geminiClient } from './gemini.client';
import { GeminiContent, GeminiPart } from './gemini.types';

export class GeminiProvider implements AIProvider {
  public readonly name: AIProviderName = 'gemini';
  public readonly capabilities: AICapabilities = GEMINI_CONFIG.capabilities;
  public readonly defaultModel: string = 'gemini-2.0-flash-lite';

  /**
   * Generates a non-streaming text response.
   */
  public async generateText(request: AIGenerateRequest): Promise<AINormalizedResult> {
    const res = await geminiClient.generateText(request.prompt, {
      model: request.model,
      apiKey: request.apiKey,
      systemInstruction: request.systemInstruction,
      temperature: request.temperature,
      maxOutputTokens: request.maxTokens,
      topP: request.topP,
      stopSequences: request.stopSequences,
      timeoutMs: request.timeoutMs,
      signal: request.signal,
    });

    return {
      text: res.text,
      provider: 'gemini',
      model: res.model,
      finishReason: res.finishReason,
      usage: res.usageMetadata
        ? {
            promptTokens: res.usageMetadata.promptTokenCount,
            completionTokens: res.usageMetadata.candidatesTokenCount,
            totalTokens: res.usageMetadata.totalTokenCount,
          }
        : undefined,
      latencyMs: res.latencyMs,
      isStreamed: false,
    };
  }

  /**
   * Generates a streaming text response.
   */
  public async generateStream(request: AIStreamRequest): Promise<AINormalizedResult> {
    const contents: string | GeminiContent[] =
      request.contents && request.contents.length > 0
        ? this.normalizeContents(request.contents)
        : request.prompt;

    const res = await geminiClient.generateStream(contents, {
      model: request.model,
      apiKey: request.apiKey,
      systemInstruction: request.systemInstruction,
      temperature: request.temperature,
      maxOutputTokens: request.maxTokens,
      topP: request.topP,
      stopSequences: request.stopSequences,
      timeoutMs: request.timeoutMs,
      signal: request.signal,
      onChunk: request.onChunk,
    });

    return {
      text: res.text,
      provider: 'gemini',
      model: res.model,
      finishReason: res.finishReason,
      usage: res.usageMetadata
        ? {
            promptTokens: res.usageMetadata.promptTokenCount,
            completionTokens: res.usageMetadata.candidatesTokenCount,
            totalTokens: res.usageMetadata.totalTokenCount,
          }
        : undefined,
      latencyMs: res.latencyMs,
      isStreamed: true,
    };
  }

  /**
   * Generates a multimodal response with image inputs.
   */
  public async generateMultimodal(request: AIMultimodalRequest): Promise<AINormalizedResult> {
    const res = await geminiClient.generateMultimodal(
      request.prompt,
      request.images.map((img) => ({ mimeType: img.mimeType, data: img.data })),
      {
        model: request.model,
        apiKey: request.apiKey,
        systemInstruction: request.systemInstruction,
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        topP: request.topP,
        stopSequences: request.stopSequences,
        timeoutMs: request.timeoutMs,
        signal: request.signal,
      }
    );

    return {
      text: res.text,
      provider: 'gemini',
      model: res.model,
      finishReason: res.finishReason,
      usage: res.usageMetadata
        ? {
            promptTokens: res.usageMetadata.promptTokenCount,
            completionTokens: res.usageMetadata.candidatesTokenCount,
            totalTokens: res.usageMetadata.totalTokenCount,
          }
        : undefined,
      latencyMs: res.latencyMs,
      isStreamed: false,
    };
  }

  /**
   * Validates a Gemini API key.
   */
  public async validateApiKey(apiKey: string): Promise<AIKeyValidationResult> {
    return geminiClient.validateApiKey(apiKey);
  }

  /**
   * Converts internal AIChatMessage[] to GeminiContent[]
   */
  private normalizeContents(contents: AIChatMessage[]): GeminiContent[] {
    return contents.map((msg) => {
      const role: 'user' | 'model' =
        msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user';

      const parts: GeminiPart[] = [];

      if (msg.parts && msg.parts.length > 0) {
        for (const p of msg.parts) {
          if (p.text) parts.push({ text: p.text });
          if (p.inlineData) {
            parts.push({
              inlineData: {
                mimeType: p.inlineData.mimeType,
                data: p.inlineData.data,
              },
            });
          }
        }
      } else if (msg.text) {
        parts.push({ text: msg.text });
      }

      return { role, parts };
    });
  }
}

export const geminiProvider = new GeminiProvider();
export default geminiProvider;
