/**
 * Common AI Provider Interface
 * Standardizes operations across Gemini, Groq, and future providers.
 */

import {
  AIProviderName,
  AICapabilities,
  AIGenerateRequest,
  AIStreamRequest,
  AIMultimodalRequest,
  AINormalizedResult,
  AIKeyValidationResult,
} from './ai-provider.types';

export interface AIProvider {
  readonly name: AIProviderName;
  readonly capabilities: AICapabilities;
  readonly defaultModel: string;

  /**
   * Generates a non-streaming text response.
   */
  generateText(request: AIGenerateRequest): Promise<AINormalizedResult>;

  /**
   * Generates an incremental streaming text response.
   */
  generateStream(request: AIStreamRequest): Promise<AINormalizedResult>;

  /**
   * Generates a multimodal response with image inputs (if supported).
   */
  generateMultimodal?(request: AIMultimodalRequest): Promise<AINormalizedResult>;

  /**
   * Validates an API key with a minimal ping test.
   */
  validateApiKey(apiKey: string): Promise<AIKeyValidationResult>;
}
