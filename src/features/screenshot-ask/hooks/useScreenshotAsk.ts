/**
 * React Hook for Screenshot-and-Ask (Multimodal Vision)
 * Manages screenshot capture, image preview, streaming conversation turns, and presets.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ProcessedScreenshot,
  VisualChatMessage,
  VisualActionPreset,
} from '../types/screenshot.types';
import { multimodalService } from '../services/multimodal.service';
import { visualContextService } from '../services/visual-context.service';

export function useScreenshotAsk() {
  const [screenshot, setScreenshot] = useState<ProcessedScreenshot | null>(null);
  const [messages, setMessages] = useState<VisualChatMessage[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up ongoing streams on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  /**
   * Captures the visible tab and prepares image for multimodal queries.
   */
  const captureScreenshot = useCallback(async () => {
    setError(null);
    setWarning(null);
    setIsCapturing(true);

    try {
      const processed = await multimodalService.captureAndProcessTab();
      setScreenshot(processed);
      setMessages([]);
      setStreamingText('');

      if (processed.isCompressed) {
        setWarning('Screenshot was optimized for faster AI processing.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to capture screenshot.';
      setError(msg);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  /**
   * Re-captures the current visible tab and replaces the active screenshot.
   */
  const retakeScreenshot = useCallback(async () => {
    await captureScreenshot();
  }, [captureScreenshot]);

  /**
   * Completely removes the screenshot and clears all image memory.
   */
  const removeScreenshot = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setScreenshot(null);
    setMessages([]);
    setStreamingText('');
    setError(null);
    setWarning(null);
    setIsProcessing(false);
  }, []);

  /**
   * Clears the visual conversation messages without discarding the screenshot.
   */
  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setStreamingText('');
    setIsProcessing(false);
  }, []);

  /**
   * Submits a question about the active screenshot.
   */
  const askQuestion = useCallback(
    async (questionText: string, isOcr = false) => {
      const trimmed = questionText.trim();
      if (!trimmed || !screenshot) return;

      setError(null);
      setIsProcessing(true);
      setStreamingText('');

      const userMessage: VisualChatMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        text: trimmed,
        timestamp: Date.now(),
        isOcr,
      };

      const updatedHistory = [...messages, userMessage];
      setMessages(updatedHistory);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const modelResponse = await multimodalService.askVisualQuestionStream(
          screenshot,
          updatedHistory,
          trimmed,
          {
            isOcr,
            signal: controller.signal,
            onChunk: (_chunk, accumulated) => {
              setStreamingText(accumulated);
            },
          }
        );

        setMessages((prev) => [...prev, modelResponse]);
        setStreamingText('');
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          // If stopped by user, save partial text if available
          setMessages((prev) => {
            if (streamingText.trim().length > 0) {
              return [
                ...prev,
                {
                  id: `model-${Date.now()}`,
                  role: 'model',
                  text: `${streamingText} *(Generation stopped by user)*`,
                  timestamp: Date.now(),
                },
              ];
            }
            return prev;
          });
        } else {
          const msg = err instanceof Error ? err.message : 'Visual Q&A generation failed.';
          setError(msg);
        }
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [screenshot, messages, streamingText]
  );

  /**
   * Executes one of the quick preset questions.
   */
  const executePreset = useCallback(
    async (preset: VisualActionPreset) => {
      const prompt = visualContextService.getPresetPrompt(preset);
      const isOcr = preset === 'ocr';
      await askQuestion(prompt, isOcr);
    },
    [askQuestion]
  );

  /**
   * Stops an in-progress generation stream.
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsProcessing(false);
    }
  }, []);

  /**
   * Retries the last user question in the conversation.
   */
  const retryLast = useCallback(async () => {
    const lastUserTurn = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserTurn) {
      // Remove last model turn if it was an error or partial
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model') {
          return prev.slice(0, -1);
        }
        return prev;
      });
      await askQuestion(lastUserTurn.text, lastUserTurn.isOcr);
    }
  }, [messages, askQuestion]);

  return {
    screenshot,
    messages,
    isCapturing,
    isProcessing,
    streamingText,
    error,
    warning,
    captureScreenshot,
    retakeScreenshot,
    removeScreenshot,
    clearChat,
    askQuestion,
    executePreset,
    stopGeneration,
    retryLast,
  };
}

export default useScreenshotAsk;
