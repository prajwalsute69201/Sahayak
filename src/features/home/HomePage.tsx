import React, { useState } from 'react';
import { useNavigationStore } from '@/store/useNavigationStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import ArticleSummary from '@/features/article-summary';
import YouTubeSummary, { isYouTubeVideoUrl } from '@/features/youtube-summary';
import GeminiTestCard from '@/features/ai-test/components/GeminiTestCard';
import ChatInterface from '@/features/page-chat';
import VisualChat from '@/features/screenshot-ask';
import { useContextAction, ContextActionResult } from '@/features/context-menu';
import {
  FileText,
  Youtube,
  Languages,
  Sparkles,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Zap,
  MessageSquare,
  LayoutList,
  Camera,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export const HomePage: React.FC = () => {
  const { activePage, setActiveTab } = useNavigationStore();
  const { settings } = useSettingsStore();
  const [viewMode, setViewMode] = useState<'chat' | 'vision' | 'summaries'>('chat');

  const {
    payload: contextPayload,
    result: contextResult,
    isProcessing: isContextProcessing,
    streamingText: contextStreamingText,
    copied: isContextCopied,
    copyResult: copyContextResult,
    retryAction: retryContextAction,
    continueInPageChat: continueContextInPageChat,
    dismissAction: dismissContextAction,
  } = useContextAction();

  const isConfigured = Boolean(settings.geminiApiKey);

  return (
    <div className="flex flex-col gap-3 text-left pb-4">
      {/* Active Context-Menu Action Result Card */}
      {contextPayload && (
        <ContextActionResult
          payload={contextPayload}
          result={contextResult}
          isProcessing={isContextProcessing}
          streamingText={contextStreamingText}
          copied={isContextCopied}
          onCopy={copyContextResult}
          onRetry={retryContextAction}
          onContinueInChat={continueContextInPageChat}
          onDismiss={dismissContextAction}
        />
      )}

      {/* Sub-tab view mode switcher (Page Chat vs Vision vs Summary) */}
      <div className="flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setViewMode('chat')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all shadow-2xs',
            viewMode === 'chat'
              ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Page Chat
        </button>

        <button
          type="button"
          onClick={() => setViewMode('vision')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all shadow-2xs',
            viewMode === 'vision'
              ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <Camera className="h-3.5 w-3.5" />
          Vision
        </button>

        <button
          type="button"
          onClick={() => setViewMode('summaries')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all shadow-2xs',
            viewMode === 'summaries'
              ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <LayoutList className="h-3.5 w-3.5" />
          Summarize & Tools
        </button>
      </div>

      {viewMode === 'chat' && (
        <div className="flex flex-col min-h-[460px]">
          <ChatInterface />
        </div>
      )}

      {viewMode === 'vision' && (
        <div className="flex flex-col min-h-[460px]">
          <VisualChat />
        </div>
      )}

      {viewMode === 'summaries' && (
        <>
          {/* Welcome / Context Card */}
          <Card className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border-blue-200/60 dark:border-blue-900/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Sahayak Assistant
                  </span>
                  <Badge variant="primary" size="sm">
                    v1.0.0
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  User-controlled browser companion. Context-grounded, privacy-first, and safe.
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Zap className="h-4 w-4" />
              </div>
            </div>

            {/* API Key Missing Alert */}
            {!isConfigured && (
              <div className="mt-3.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900/50 dark:bg-amber-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
                      Gemini API Key required for AI tasks.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('settings')}
                    className="h-6 text-[11px] px-2 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200"
                  >
                    Add Key
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Active Page Context Overview */}
          <Card variant="muted" className="p-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Active Page Context
              </span>
              <Badge
                variant={
                  isYouTubeVideoUrl(activePage?.url || '')
                    ? 'primary'
                    : activePage?.isSupported
                      ? 'success'
                      : 'warning'
                }
                size="sm"
              >
                {isYouTubeVideoUrl(activePage?.url || '')
                  ? 'YouTube Video'
                  : activePage?.isSupported
                    ? 'Supported Page'
                    : 'Restricted URL'}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {activePage?.title || 'No active tab detected'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {activePage?.url || 'Open any standard web page or YouTube video to begin analysis.'}
            </p>
          </Card>

          {/* Dynamic Context Card: If on YouTube, highlight YouTube Summarizer; else Article Summarizer */}
          {isYouTubeVideoUrl(activePage?.url || '') ? (
            <>
              <YouTubeSummary />
              <ArticleSummary />
            </>
          ) : (
            <>
              <ArticleSummary />
              <YouTubeSummary />
            </>
          )}

          {/* Slice 2: Gemini Direct AI Playground */}
          <GeminiTestCard />

          {/* Quick Actions Grid */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Core Capabilities
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => setViewMode('chat')}
                className="flex flex-col justify-between rounded-xl border border-blue-200 bg-blue-50/30 p-3 text-left transition-all hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
              >
                <div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Grounded Page Chat
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Streamed answers grounded in page content.
                  </p>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  Slice 6 (Active) <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>

              <div
                onClick={() => setViewMode('summaries')}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
              >
                <div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Summarize Article
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Extract readable text with structured 3-part summary.
                  </p>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  Slice 3 (Ready) <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>

              <div
                onClick={() => setViewMode('summaries')}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-red-400 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
              >
                <div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
                    <Youtube className="h-4 w-4" />
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    YouTube Notes
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Chapter summaries with clickable timestamp seek.
                  </p>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                  Slice 4 (Ready) <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-purple-400 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                    <Languages className="h-4 w-4" />
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Hinglish Engine
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Fluid conversation blending Hindi and English technical terms.
                  </p>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                  Slice 5 (Ready) <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Vision & Ask
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Capture tab screenshot and query visual charts or diagrams.
                  </p>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Slice 8 <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Zero-Telemetry Guarantee Card */}
          <Card className="flex items-center gap-3 border-emerald-200/70 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-[11px] text-emerald-900 dark:text-emerald-200">
              <span className="font-semibold">Local-First Guarantee</span>: Zero external tracking
              or telemetry. Your keys, memory profiles, and history never leave your computer.
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default HomePage;
