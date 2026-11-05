/**
 * AI Provider Types for Sahayak Centralized AI Orchestration
 * Defines standardized request, response, and capability interfaces.
 */

export type AIProviderName = 'gemini' | 'groq';

/**
 * Provider capability declarations
 */
export interface AICapabilities {
  text: boolean;
  streaming: boolean;
  multimodal: boolean;
  structuredOutput: boolean;
}

/**
 * Image part definition for multimodal requests
 */
export interface AIImagePart {
  mimeType: string;
  data: string; // Base64-encoded string without "data:image/...;base64," prefix
}

/**
 * Normalized multi-turn chat message
 */
export interface AIChatMessage {
  role: 'user' | 'model' | 'system' | 'assistant';
  parts?: Array<{
    text?: string;
    inlineData?: AIImagePart;
  }>;
  text?: string;
}

/**
 * Standard parameters for text generation
 */
export interface AIGenerateRequest {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Multimodal generation request
 */
export interface AIMultimodalRequest extends AIGenerateRequest {
  images: AIImagePart[];
}

/**
 * Streaming generation request
 */
export interface AIStreamRequest extends AIGenerateRequest {
  onChunk?: (chunkText: string, fullAggregatedText: string) => void;
  contents?: AIChatMessage[];
}

/**
 * Token usage metadata
 */
export interface AIUsageMetadata {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/**
 * Normalized result returned across all providers
 */
export interface AINormalizedResult {
  text: string;
  provider: AIProviderName;
  model: string;
  finishReason?: string;
  usage?: AIUsageMetadata;
  latencyMs: number;
  isStreamed?: boolean;
  fallbackTriggered?: boolean;
  fallbackReason?: string;
  attempts?: number;
}

/**
 * Provider health and configuration status
 */
export interface AIProviderStatus {
  provider: AIProviderName;
  name: string;
  isConfigured: boolean;
  defaultModel: string;
  capabilities: AICapabilities;
  lastUsedTimestamp?: number;
  lastLatencyMs?: number;
  lastError?: string;
}

/**
 * Validation check result for an API key
 */
export interface AIKeyValidationResult {
  valid: boolean;
  latencyMs: number;
  error?: string;
}
