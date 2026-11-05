import { useState, useCallback } from 'react';
import { geminiClient, GeminiGenerateOptions, GeminiTextResult } from '@/services/gemini';

export interface UseGeminiTestState {
  isLoading: boolean;
  result: GeminiTextResult | null;
  error: string | null;
  submitPrompt: (
    prompt: string,
    options?: GeminiGenerateOptions
  ) => Promise<GeminiTextResult | null>;
  reset: () => void;
}

export function useGeminiTest(): UseGeminiTestState {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeminiTextResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitPrompt = useCallback(async (prompt: string, options: GeminiGenerateOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await geminiClient.generateText(prompt, options);
      setResult(res);
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      setResult(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    isLoading,
    result,
    error,
    submitPrompt,
    reset,
  };
}

export default useGeminiTest;
