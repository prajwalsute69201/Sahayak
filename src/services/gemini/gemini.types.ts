/**
 * Google Gemini API Client Type Definitions for Sahayak
 */

export type GeminiModel =
  | 'gemini-2.0-flash-lite'
  | 'gemini-2.0-flash'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  | (string & {});

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiContent {
  role?: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  candidateCount?: number;
}

export interface GeminiSystemInstruction {
  parts: GeminiPart[];
}

export interface GeminiGenerateContentRequest {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
  generationConfig?: GeminiGenerationConfig;
}

export interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface GeminiSafetyRating {
  category: string;
  probability: string;
  blocked?: boolean;
}

export interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
    role?: string;
  };
  finishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER' | string;
  index?: number;
  safetyRatings?: GeminiSafetyRating[];
}

export interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
  modelVersion?: string;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: GeminiSafetyRating[];
  };
}

export interface GeminiApiErrorDetails {
  code?: number;
  message?: string;
  status?: string;
  details?: unknown[];
}

export interface GeminiApiErrorResponse {
  error?: GeminiApiErrorDetails;
}

/** Options for client text generation requests */
export interface GeminiGenerateOptions {
  model?: GeminiModel;
  apiKey?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  systemInstruction?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Clean, structured response format returned to callers */
export interface GeminiTextResult {
  text: string;
  model: string;
  finishReason?: string;
  usageMetadata?: GeminiUsageMetadata;
  latencyMs: number;
}

/** Image input format for multimodal Gemini requests */
export interface GeminiImageInput {
  mimeType: string;
  data: string; // Base64-encoded string without "data:image/...;base64," prefix
}

/** Options for client multimodal generation requests */
export interface GeminiMultimodalOptions extends GeminiGenerateOptions {
  images?: GeminiImageInput[];
}

/** Options for client streaming generation requests */
export interface GeminiStreamOptions extends GeminiGenerateOptions {
  /** Optional callback fired whenever a new text chunk is decoded */
  onChunk?: (chunkText: string, fullAggregatedText: string) => void;
  /** Direct multi-turn contents array (overrides prompt string if provided) */
  contents?: GeminiContent[];
}

/** Result of a streaming response */
export interface GeminiStreamResult {
  text: string;
  model: string;
  finishReason?: string;
  usageMetadata?: GeminiUsageMetadata;
  latencyMs: number;
  isStreamed: boolean;
}
