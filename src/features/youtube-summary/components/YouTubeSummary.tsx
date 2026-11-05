import React, { useState, useEffect } from 'react';
import { useYouTubeSummary } from '../hooks/useYouTubeSummary';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNavigationStore } from '@/store/useNavigationStore';
import { LanguagePreference } from '@/types/settings.types';
import YouTubeVideoInfo from './YouTubeVideoInfo';
import VideoSummarySection from './VideoSummarySection';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import {
  Youtube,
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
  PlayCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const YouTubeSummary: React.FC = () => {
  const { status, metadata, summary, error, isYouTubePage, summarizeVideo, seekTo, retry, reset } =
    useYouTubeSummary();

  const { settings } = useSettingsStore();
  const { setActiveTab } = useNavigationStore();

  const [customUrl, setCustomUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [summaryLang, setSummaryLang] = useState<LanguagePreference>(settings.language);

  useEffect(() => {
    setSummaryLang(settings.language);
  }, [settings.language]);

  const isKeyConfigured = Boolean(settings.geminiApiKey?.trim());

  const handleCopySummary = async () => {
    if (!summary || !metadata) return;

    const lines: string[] = [
      `# ${metadata.title}`,
      `Channel: ${metadata.channelName}`,
      `URL: ${metadata.videoUrl}`,
      '',
      '## Overview',
      summary.overview,
      '',
      '## Key Takeaways',
      ...summary.keyTakeaways.map((k) => `- ${k}`),
      '',
      '## Important Moments',
      ...summary.importantMoments.map((m) => `- [${m.timestamp}] **${m.title}**: ${m.description}`),
      '',
      '## Detailed Summary',
      summary.detailedSummary,
      '',
      '## Important Facts & Statistics',
      ...summary.importantFacts.map((f) => `- ${f}`),
      '',
      '## Conclusion',
      summary.conclusion,
      '',
      '## Topics & Keywords',
      summary.topicsAndKeywords.join(', '),
      '',
      '---',
      '_Summarized by Sahayak Browser Agent (सहायक)_',
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      summarizeVideo(customUrl.trim(), summaryLang);
    }
  };

  const isLoading =
    status === 'detecting' ||
    status === 'extracting_metadata' ||
    status === 'extracting_transcript' ||
    status === 'summarizing';

  return (
    <div className="flex flex-col gap-3 text-left">
      {/* 1. Header & Context */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
            <Youtube className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              YouTube Video Notes
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Structured chapter summaries with clickable timestamp seek
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
                    ? 'bg-red-600 text-white'
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
              variant="outline"
              size="sm"
              onClick={reset}
              className="h-7 text-xs gap-1 border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              New
            </Button>
          )}
        </div>
      </div>

      {/* 2. API Key Warning Banner */}
      {!isKeyConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Gemini API key is required to summarize videos.</span>
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

      {/* 3. Detected YouTube Video Preview (Before Summary) */}
      {metadata && !summary && !isLoading && (
        <div className="space-y-2">
          <YouTubeVideoInfo metadata={metadata} />

          <Button
            variant="primary"
            onClick={() => summarizeVideo(undefined, summaryLang)}
            disabled={!isKeyConfigured || isLoading}
            className="w-full gap-2 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white border-none shadow-sm cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            Summarize Active Video
          </Button>
        </div>
      )}

      {/* 4. Non-YouTube Page / Custom URL Input */}
      {!isYouTubePage && !metadata && !summary && !isLoading && (
        <Card variant="muted" className="p-3 text-left">
          <div className="flex items-start gap-2.5">
            <PlayCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                No YouTube Video Active
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Open any YouTube video watch page, or paste a link below to generate chapter
                summaries.
              </p>
            </div>
          </div>

          <form onSubmit={handleCustomSubmit} className="mt-3 flex gap-2">
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="text-xs h-8 flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!customUrl.trim() || !isKeyConfigured}
              className="h-8 text-xs px-3 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              Summarize <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </form>
        </Card>
      )}

      {/* 5. Granular Loading States */}
      {isLoading && (
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {status === 'extracting_metadata' && 'Fetching video details...'}
            {status === 'extracting_transcript' &&
              'Retrieving official video transcript & captions...'}
            {status === 'summarizing' && 'Generating chapter breakdown with Gemini...'}
            {status === 'detecting' && 'Detecting active video...'}
          </h4>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
            {status === 'extracting_transcript'
              ? 'Parsing timed caption tracks and cleaning speech fragments...'
              : 'Synthesizing timestamps, key takeaways, and structured sections.'}
          </p>
        </Card>
      )}

      {/* 6. Error Banner */}
      {status === 'error' && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex flex-col gap-2">
            <div className="font-semibold text-red-800 dark:text-red-300">
              Video Summarisation Failed
            </div>
            <p className="leading-relaxed">{error}</p>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={retry}
                className="h-6 text-[11px] border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Structured Summary Display */}
      {summary && metadata && (
        <div className="space-y-3">
          {/* Metadata Compact Card */}
          <YouTubeVideoInfo metadata={metadata} />

          {/* Action Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Structured Video Notes
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySummary}
                className="h-7 text-xs gap-1 border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy Notes
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Overview */}
          <VideoSummarySection
            title="Quick Overview"
            icon={<Sparkles className="h-3.5 w-3.5" />}
            badge="Overview"
          >
            <p className="leading-relaxed">{summary.overview}</p>
          </VideoSummarySection>

          {/* Important Moments (Clickable Timestamps) */}
          {summary.importantMoments && summary.importantMoments.length > 0 && (
            <VideoSummarySection
              title="Important Moments & Chapters"
              icon={<Clock className="h-3.5 w-3.5" />}
              badge={`${summary.importantMoments.length} Chapters`}
              moments={summary.importantMoments}
              onSeek={seekTo}
            />
          )}

          {/* Key Takeaways */}
          <VideoSummarySection
            title="Key Takeaways"
            icon={<ListOrdered className="h-3.5 w-3.5" />}
            badge={`${summary.keyTakeaways.length} Takeaways`}
          >
            <ul className="space-y-1.5">
              {summary.keyTakeaways.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </VideoSummarySection>

          {/* Detailed Summary */}
          <VideoSummarySection title="Detailed Summary" icon={<BookOpen className="h-3.5 w-3.5" />}>
            <p className="whitespace-pre-line leading-relaxed">{summary.detailedSummary}</p>
          </VideoSummarySection>

          {/* Important Facts */}
          {summary.importantFacts && summary.importantFacts.length > 0 && (
            <VideoSummarySection
              title="Key Facts & Data"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              <ul className="space-y-1">
                {summary.importantFacts.map((fact, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </VideoSummarySection>
          )}

          {/* Conclusion */}
          <VideoSummarySection title="Conclusion" icon={<Flag className="h-3.5 w-3.5" />}>
            <p className="leading-relaxed">{summary.conclusion}</p>
          </VideoSummarySection>

          {/* Topics and Keywords */}
          {summary.topicsAndKeywords && summary.topicsAndKeywords.length > 0 && (
            <VideoSummarySection title="Topics & Keywords" icon={<Tag className="h-3.5 w-3.5" />}>
              <div className="flex flex-wrap gap-1.5">
                {summary.topicsAndKeywords.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </VideoSummarySection>
          )}
        </div>
      )}
    </div>
  );
};

export default YouTubeSummary;
