/**
 * Groq OpenAI-Compatible API Request and Response Types
 */

export interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChatCompletionRequest {
  model: string;
  messages: GroqChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string[];
}

export interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface GroqChoice {
  index?: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface GroqChatCompletionResponse {
  id: string;
  object?: string;
  created?: number;
  model: string;
  choices: GroqChoice[];
  usage?: GroqUsage;
}

export interface GroqStreamDelta {
  content?: string;
  role?: string;
}

export interface GroqStreamChoice {
  index?: number;
  delta: GroqStreamDelta;
  finish_reason?: string | null;
}

export interface GroqStreamChunk {
  id: string;
  object?: string;
  created?: number;
  model: string;
  choices: GroqStreamChoice[];
  usage?: GroqUsage;
}

export interface GroqErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}
