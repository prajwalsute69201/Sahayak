/**
 * AI Provider Configurations and Defaults
 */

import { AICapabilities } from './ai-provider.types';

export const GEMINI_CONFIG = {
  name: 'Google Gemini',
  defaultModel: 'gemini-2.0-flash-lite',
  models: [
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite (Recommended, Ultra-Fast)' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fast, Multimodal)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Complex Reasoning)' },
  ],
  capabilities: {
    text: true,
    streaming: true,
    multimodal: true,
    structuredOutput: true,
  } as AICapabilities,
};

export const GROQ_CONFIG = {
  name: 'Groq Cloud',
  defaultModel: 'llama-3.3-70b-versatile',
  models: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Recommended)' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra-Fast)' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k Context)' },
  ],
  capabilities: {
    text: true,
    streaming: true,
    multimodal: false, // Groq Llama text models do not accept image inputs
    structuredOutput: true,
  } as AICapabilities,
};

export const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelayMs: 1500,
  maxDelayMs: 10000,
  jitterMs: 300,
};
