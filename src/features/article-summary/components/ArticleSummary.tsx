import React, { useState, useEffect } from 'react';
import { useArticleSummary } from '../hooks/useArticleSummary';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNavigationStore } from '@/store/useNavigationStore';
import { LanguagePreference } from '@/types/settings.types';
import ArticleMetadata from './ArticleMetadata';
import SummarySection from './SummarySection';
import Button from '@/components/common/Button';
import FeedbackBanner from '@/components/common/FeedbackBanner';
import {
  FileText,
  Sparkles,
  ListOrdered,
  BookOpen,
  CheckCircle2,
  Flag,
  Tag,
  RotateCcw,
  Copy,
  Check,
  Loader2,
  KeyRound,
} from 'lucide-react';

export const ArticleSummary: React.FC = () => {
  const { status, article, summary, error, summarizeActiveTab, retry, reset } = useArticleSummary();
  const { settings } = useSettingsStore();
  const { setActiveTab } = useNavigationStore();
  const [copied, setCopied] = useState(false);
  const [summaryLang, setSummaryLang] = useState<LanguagePreference>(settings.language);

  useEffect(() => {
    setSummaryLang(settings.language);
  }, [settings.language]);

  const isKeyConfigured = Boolean(settings.geminiApiKey?.trim());

  const handleCopySummary = async () => {
    if (!summary || !article) return;
    const textLines = [
      `# ${article.title}`,
      `Source: ${article.url}`,
      '',
      '## Overview',
      summary.overview,
      '',
      '## Key Points',
      ...summary.keyPoints.map((p, i) => `${i + 1}. ${p}`),
      '',
      '## Detailed Summary',
      summary.detailedSummary,
      '',
      '## Important Facts',
      ...summary.importantFacts.map((f) => `- ${f}`),
      '',
      '## Conclusion',
      summary.conclusion,
      '',
      `Summarized by Sahayak using ${summary.modelUsed}`,
    ];

    await navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3.5 text-left pb-4">
      {/* Primary Action Header Card */}
      <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/30 p-3.5 dark:border-blue-900/50 dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Article Summarizer
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Mozilla Readability + Gemini Structured Summary
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Per-Summary Language Selector */}
          <div className="flex rounded-md border border-slate-300 bg-white/80 p-0.5 text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-800">
            {(['auto', 'en', 'hi-en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSummaryLang(lang)}
                className={`rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                  summaryLang === lang
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title={`Summarize in ${lang === 'hi-en' ? 'Hinglish' : lang === 'auto' ? 'Auto Detect' : 'English'}`}
              >
                {lang === 'hi-en' ? 'HI' : lang.toUpperCase()}
              </button>
            ))}
          </div>

          {summary && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reset}
              className="h-8 px-2 text-xs text-slate-600 dark:text-slate-300"
              title="Clear summary"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={status === 'extracting' || status === 'summarizing'}
            onClick={() => summarizeActiveTab(summaryLang)}
            className="h-8 px-3 text-xs cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{summary ? 'Re-summarize' : 'Summarize Page'}</span>
          </Button>
        </div>
      </div>

      {/* Missing Key Banner */}
      {!isKeyConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Gemini API key is required to generate summaries.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('settings')}
              className="h-6 px-2 text-[11px] border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200"
            >
              Add Key
            </Button>
          </div>
        </div>
      )}

      {/* Multi-Step Extraction & Summarization Loading Indicator */}
      {(status === 'extracting' || status === 'summarizing') && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {status === 'extracting'
              ? 'Step 1 of 2: Extracting clean article content...'
              : 'Step 2 of 2: Gemini generating structured summary...'}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
            {status === 'extracting'
              ? 'Filtering out advertisements, navigation bars, and irrelevant page elements.'
              : `Synthesizing takeaways in ${settings.language === 'hi-en' ? 'Hinglish' : 'English'} using ${settings.preferredModel}.`}
          </p>
        </div>
      )}

      {/* Error State with Retry Button */}
      {status === 'error' && error && (
        <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-left dark:border-red-900/40 dark:bg-red-950/20">
          <FeedbackBanner status="error" message={error} onDismiss={reset} />
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={retry}
              className="h-7 px-2.5 text-xs border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      )}

      {/* Success View: Display Metadata & Structured Summary */}
      {status === 'success' && summary && article && (
        <div className="flex flex-col gap-3">
          {/* Metadata Bar */}
          <ArticleMetadata article={article} />

          {/* Quick Copy Action Bar */}
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Generated in {settings.language === 'hi-en' ? 'Hinglish' : 'English'}</span>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          </div>

          {/* Section 1: Quick Overview */}
          {summary.overview && (
            <SummarySection icon={Sparkles} title="Quick Overview">
              <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {summary.overview}
              </p>
            </SummarySection>
          )}

          {/* Section 2: Key Takeaways */}
          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <SummarySection
              icon={ListOrdered}
              title="Key Takeaways"
              count={summary.keyPoints.length}
            >
              <ul className="space-y-2">
                {summary.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{point}</span>
                  </li>
                ))}
              </ul>
            </SummarySection>
          )}

          {/* Section 3: Detailed Summary */}
          {summary.detailedSummary && (
            <SummarySection icon={BookOpen} title="Detailed Breakdown">
              <div className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">
                {summary.detailedSummary}
              </div>
            </SummarySection>
          )}

          {/* Section 4: Important Facts, Dates & Statistics */}
          {summary.importantFacts && summary.importantFacts.length > 0 && (
            <SummarySection
              icon={CheckCircle2}
              title="Important Facts & Data"
              count={summary.importantFacts.length}
            >
              <div className="flex flex-col gap-1.5">
                {summary.importantFacts.map((fact, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                  >
                    <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">•</span>
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            </SummarySection>
          )}

          {/* Section 5: Conclusion */}
          {summary.conclusion && (
            <SummarySection icon={Flag} title="Conclusion & Core Takeaway">
              <p className="italic text-slate-800 dark:text-slate-200 leading-relaxed">
                &ldquo;{summary.conclusion}&rdquo;
              </p>
            </SummarySection>
          )}

          {/* Section 6: Topics & Keywords */}
          {summary.topicsAndKeywords && summary.topicsAndKeywords.length > 0 && (
            <SummarySection icon={Tag} title="Topics & Keywords">
              <div className="flex flex-wrap gap-1.5">
                {summary.topicsAndKeywords.map((topic, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            </SummarySection>
          )}
        </div>
      )}
    </div>
  );
};

export default ArticleSummary;
