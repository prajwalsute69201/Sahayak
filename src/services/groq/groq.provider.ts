/**
 * Groq AI Provider Implementation
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
import { AICapabilityError } from '../ai/errors/provider.errors';
import { GROQ_CONFIG } from '../ai/ai-provider.config';
import { groqClient, GroqClient } from './groq.client';
import { GroqChatMessage } from './groq.types';

export class GroqProvider implements AIProvider {
  public readonly name: AIProviderName = 'groq';
  public readonly capabilities: AICapabilities = GROQ_CONFIG.capabilities;
  public readonly defaultModel: string = GroqClient.DEFAULT_MODEL;

  /**
   * Generates non-streaming text completion.
   */
  public async generateText(request: AIGenerateRequest): Promise<AINormalizedResult> {
    return groqClient.generateText(request.prompt, request);
  }

  /**
   * Generates streaming text completion.
   */
  public async generateStream(request: AIStreamRequest): Promise<AINormalizedResult> {
    if (request.contents && request.contents.length > 0) {
      const messages = this.normalizeChatMessages(request.contents, request.systemInstruction);
      return groqClient.generateStream(messages, request);
    }

    return groqClient.generateStream(request.prompt, request);
  }

  /**
   * Multimodal generation is unsupported on standard Groq Llama text models.
   */
  public async generateMultimodal(_request: AIMultimodalRequest): Promise<AINormalizedResult> {
    throw new AICapabilityError(
      'groq',
      'multimodal',
      'Groq text models (Llama 3.3) do not accept image inputs. Please use Gemini for multimodal requests.'
    );
  }

  /**
   * Validates a Groq API key via ping test.
   */
  public async validateApiKey(apiKey: string): Promise<AIKeyValidationResult> {
    return groqClient.validateApiKey(apiKey);
  }

  /**
   * Maps internal AIChatMessage turns into Groq/OpenAI compatible format.
   */
  private normalizeChatMessages(
    contents: AIChatMessage[],
    systemInstruction?: string
  ): GroqChatMessage[] {
    const messages: GroqChatMessage[] = [];

    if (systemInstruction && systemInstruction.trim()) {
      messages.push({
        role: 'system',
        content: systemInstruction.trim(),
      });
    }

    for (const msg of contents) {
      let role: 'user' | 'assistant' = 'user';
      if (msg.role === 'model' || msg.role === 'assistant') {
        role = 'assistant';
      }

      let text = msg.text || '';
      if (!text && msg.parts) {
        text = msg.parts
          .map((p) => p.text || '')
          .join('')
          .trim();
      }

      if (text) {
        messages.push({ role, content: text });
      }
    }

    return messages;
  }
}

export const groqProvider = new GroqProvider();
export default groqProvider;
