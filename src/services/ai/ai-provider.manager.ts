/**
 * Centralized AI Provider Manager
 * Provides a single, unified interface for all Sahayak features,
 * routing requests to Gemini and Groq with automatic retry and fallback.
 */

import { storageService } from '@/services/storage.service';
import { SETTINGS_STORAGE_KEY, UserSettings } from '@/types/settings.types';
import {
  AIProviderName,
  AIGenerateRequest,
  AIStreamRequest,
  AIMultimodalRequest,
  AINormalizedResult,
  AIProviderStatus,
  AIKeyValidationResult,
} from './ai-provider.types';
import { AIProvider } from './ai-provider.interface';
import { geminiProvider } from '../gemini/gemini.provider';
import { groqProvider } from '../groq/groq.provider';
import { aiFallbackService, FallbackCascadeOptions } from './ai-fallback.service';

export class AIProviderManager {
  private providers = new Map<AIProviderName, AIProvider>();
  private latestResult: AINormalizedResult | null = null;
  private fallbackListeners: Array<
    (from: AIProviderName, to: AIProviderName, reason: string) => void
  > = [];

  constructor() {
    this.registerProvider(geminiProvider);
    this.registerProvider(groqProvider);
  }

  /**
   * Registers an AI provider implementation.
   */
  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Subscribes to provider fallback events.
   */
  public onFallback(
    listener: (from: AIProviderName, to: AIProviderName, reason: string) => void
  ): () => void {
    this.fallbackListeners.push(listener);
    return () => {
      this.fallbackListeners = this.fallbackListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Retrieves the most recent normalized generation result.
   */
  public getLatestResult(): AINormalizedResult | null {
    return this.latestResult;
  }

  /**
   * Resolves the primary and fallback providers according to user settings.
   */
  public async resolveProviders(): Promise<{
    primary: AIProvider;
    fallback: AIProvider | null;
  }> {
    const settings = await storageService.get<UserSettings>(SETTINGS_STORAGE_KEY);
    const primaryName: AIProviderName = settings?.primaryProvider === 'groq' ? 'groq' : 'gemini';
    const fallbackName: AIProviderName = primaryName === 'gemini' ? 'groq' : 'gemini';

    const primary = this.providers.get(primaryName) || geminiProvider;
    const fallback =
      settings?.enableFallback !== false ? this.providers.get(fallbackName) || null : null;

    return { primary, fallback };
  }

  /**
   * Generates a non-streaming text response via provider cascade.
   */
  public async generateText(
    prompt: string,
    options: Partial<AIGenerateRequest> = {}
  ): Promise<AINormalizedResult> {
    const { primary, fallback } = await this.resolveProviders();

    const request: AIGenerateRequest = {
      prompt,
      ...options,
    };

    const cascadeOptions: FallbackCascadeOptions = {
      onFallback: (from, to, reason) => {
        this.notifyFallback(from, to, reason);
      },
    };

    const result = await aiFallbackService.executeTextWithFallback(
      primary,
      fallback,
      request,
      cascadeOptions
    );

    this.latestResult = result;
    return result;
  }

  /**
   * Generates a streaming text response via provider cascade.
   */
  public async generateStream(
    promptOrRequest: string | AIStreamRequest,
    options: Partial<AIStreamRequest> = {}
  ): Promise<AINormalizedResult> {
    const { primary, fallback } = await this.resolveProviders();

    const request: AIStreamRequest =
      typeof promptOrRequest === 'string'
        ? { prompt: promptOrRequest, ...options }
        : { ...promptOrRequest, ...options };

    const cascadeOptions: FallbackCascadeOptions = {
      onFallback: (from, to, reason) => {
        this.notifyFallback(from, to, reason);
      },
    };

    const result = await aiFallbackService.executeStreamWithFallback(
      primary,
      fallback,
      request,
      cascadeOptions
    );

    this.latestResult = result;
    return result;
  }

  /**
   * Generates a multimodal response.
   */
  public async generateMultimodal(request: AIMultimodalRequest): Promise<AINormalizedResult> {
    const { primary, fallback } = await this.resolveProviders();

    const cascadeOptions: FallbackCascadeOptions = {
      onFallback: (from, to, reason) => {
        this.notifyFallback(from, to, reason);
      },
    };

    const result = await aiFallbackService.executeMultimodalWithFallback(
      primary,
      fallback,
      request,
      cascadeOptions
    );

    this.latestResult = result;
    return result;
  }

  /**
   * Validates an API key for a specified provider.
   */
  public async validateKey(
    providerName: AIProviderName,
    apiKey: string
  ): Promise<AIKeyValidationResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return { valid: false, latencyMs: 0, error: `Unknown provider: ${providerName}` };
    }
    return provider.validateApiKey(apiKey);
  }

  /**
   * Retrieves provider status and readiness.
   */
  public async getProviderStatus(providerName: AIProviderName): Promise<AIProviderStatus | null> {
    const provider = this.providers.get(providerName);
    if (!provider) return null;

    const settings = await storageService.get<UserSettings>(SETTINGS_STORAGE_KEY);
    const key = providerName === 'gemini' ? settings?.geminiApiKey : settings?.groqApiKey;

    return {
      provider: providerName,
      name: providerName === 'gemini' ? 'Google Gemini' : 'Groq Cloud',
      isConfigured: Boolean(key && key.trim().length > 0),
      defaultModel: provider.defaultModel,
      capabilities: provider.capabilities,
      lastUsedTimestamp: this.latestResult?.provider === providerName ? Date.now() : undefined,
      lastLatencyMs:
        this.latestResult?.provider === providerName ? this.latestResult.latencyMs : undefined,
    };
  }

  private notifyFallback(from: AIProviderName, to: AIProviderName, reason: string): void {
    for (const listener of this.fallbackListeners) {
      try {
        listener(from, to, reason);
      } catch (err) {
        console.warn('[AIProviderManager] Fallback listener error:', err);
      }
    }
  }
}

export const aiProviderManager = new AIProviderManager();
export default aiProviderManager;
