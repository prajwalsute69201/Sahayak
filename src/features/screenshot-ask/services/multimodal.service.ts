/**
 * Multimodal Service
 * Coordinates screenshot capture, image processing, prompt construction,
 * and multimodal generation via the Gemini client.
 */

import { geminiClient } from '@/services/gemini/gemini.client';
import { storageService } from '@/services/storage.service';
import { SETTINGS_STORAGE_KEY, UserSettings } from '@/types/settings.types';
import { LanguagePreference } from '@/services/language/language.types';
import { screenshotService } from './screenshot.service';
import { imageProcessingService } from './image-processing.service';
import { visualContextService } from './visual-context.service';
import {
  ProcessedScreenshot,
  VisualChatMessage,
  VisualActionPreset,
} from '../types/screenshot.types';

export interface VisualQuestionOptions {
  apiKey?: string;
  language?: LanguagePreference;
  isOcr?: boolean;
  signal?: AbortSignal;
  onChunk?: (chunk: string, aggregated: string) => void;
}

export class MultimodalService {
  /**
   * Captures the visible tab and prepares the processed image in a single call.
   */
  public async captureAndProcessTab(format: 'png' | 'jpeg' = 'png'): Promise<ProcessedScreenshot> {
    const raw = await screenshotService.captureActiveTab(format);
    return imageProcessingService.processScreenshot(raw);
  }

  /**
   * Executes a streaming visual Q&A turn using Gemini multimodal API.
   */
  public async askVisualQuestionStream(
    screenshot: ProcessedScreenshot,
    history: VisualChatMessage[],
    question: string,
    options: VisualQuestionOptions = {}
  ): Promise<VisualChatMessage> {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      throw new Error('Question cannot be empty.');
    }

    // 1. Resolve user language preference from settings if not explicitly provided
    let languagePref: LanguagePreference = options.language || 'auto';
    if (!options.language) {
      const settings = await storageService.get<UserSettings>(SETTINGS_STORAGE_KEY);
      if (settings?.language) {
        languagePref = settings.language;
      }
    }

    // 2. Build system instruction with anti-injection and language rules
    const systemInstruction = visualContextService.buildSystemInstruction(
      languagePref,
      trimmedQuestion,
      options.isOcr
    );

    // 3. Build multi-turn Gemini contents
    const contents = visualContextService.buildConversationContents(
      screenshot,
      history,
      trimmedQuestion
    );

    // 4. Dispatch stream request to Gemini
    const startTime = performance.now();
    const streamResult = await geminiClient.generateStream(contents, {
      apiKey: options.apiKey,
      systemInstruction,
      temperature: options.isOcr ? 0.2 : 0.4,
      signal: options.signal,
      onChunk: options.onChunk,
    });

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'model',
      text: streamResult.text,
      timestamp: Date.now(),
      isStreaming: false,
      isOcr: options.isOcr,
      latencyMs,
    };
  }

  /**
   * Executes a preset visual query on the screenshot.
   */
  public async executePresetStream(
    preset: VisualActionPreset,
    screenshot: ProcessedScreenshot,
    history: VisualChatMessage[],
    options: VisualQuestionOptions = {}
  ): Promise<{ question: string; answer: VisualChatMessage }> {
    const question = visualContextService.getPresetPrompt(preset);
    const isOcr = preset === 'ocr';

    const answer = await this.askVisualQuestionStream(screenshot, history, question, {
      ...options,
      isOcr,
    });

    return { question, answer };
  }
}

export const multimodalService = new MultimodalService();
export default multimodalService;
