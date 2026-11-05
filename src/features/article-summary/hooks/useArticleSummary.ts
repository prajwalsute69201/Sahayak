import { useState, useCallback } from 'react';
import { ExtractedArticle, StructuredSummary, SummaryStepStatus } from '../types/article.types';
import { articleExtractorService } from '../services/article-extractor.service';
import { summaryService } from '../services/summary.service';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LanguagePreference } from '@/types/settings.types';

export interface UseArticleSummaryResult {
  status: SummaryStepStatus;
  article: ExtractedArticle | null;
  summary: StructuredSummary | null;
  error: string | null;
  summarizeActiveTab: (overrideLanguage?: LanguagePreference) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

export function useArticleSummary(): UseArticleSummaryResult {
  const [status, setStatus] = useState<SummaryStepStatus>('idle');
  const [article, setArticle] = useState<ExtractedArticle | null>(null);
  const [summary, setSummary] = useState<StructuredSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { settings } = useSettingsStore();

  const summarizeActiveTab = useCallback(
    async (overrideLanguage?: LanguagePreference) => {
      setStatus('extracting');
      setError(null);
      setSummary(null);

      let extracted: ExtractedArticle | null = null;

      // Phase 1: Article Extraction
      try {
        extracted = await articleExtractorService.extractFromActiveTab();
        setArticle(extracted);
      } catch (extractErr) {
        const msg =
          extractErr instanceof Error
            ? extractErr.message
            : 'Failed to extract article content from current tab.';
        setError(msg);
        setStatus('error');
        return;
      }

      // Phase 2: AI Summarization with Gemini
      setStatus('summarizing');
      try {
        const effectiveLang = overrideLanguage || settings.language;
        const generated = await summaryService.generateSummary(
          extracted,
          effectiveLang,
          settings.preferredModel
        );
        setSummary(generated);
        setStatus('success');
      } catch (sumErr) {
        const msg =
          sumErr instanceof Error
            ? sumErr.message
            : 'Failed to generate summary. Please check your Gemini API key in Settings.';
        setError(msg);
        setStatus('error');
      }
    },
    [settings.language, settings.preferredModel]
  );

  const retry = useCallback(async () => {
    await summarizeActiveTab();
  }, [summarizeActiveTab]);

  const reset = useCallback(() => {
    setStatus('idle');
    setArticle(null);
    setSummary(null);
    setError(null);
  }, []);

  return {
    status,
    article,
    summary,
    error,
    summarizeActiveTab,
    retry,
    reset,
  };
}

export default useArticleSummary;
