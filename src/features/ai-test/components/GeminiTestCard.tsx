import React, { useState } from 'react';
import { useGeminiTest } from '../hooks/useGeminiTest';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNavigationStore } from '@/store/useNavigationStore';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import FeedbackBanner from '@/components/common/FeedbackBanner';
import {
  Sparkles,
  Send,
  RotateCcw,
  KeyRound,
  Clock,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const GeminiTestCard: React.FC = () => {
  const { settings } = useSettingsStore();
  const { setActiveTab } = useNavigationStore();
  const { isLoading, result, error, submitPrompt, reset } = useGeminiTest();

  const [prompt, setPrompt] = useState(
    'Explain what Chrome Extension Manifest V3 is in two clear bullet points.'
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(300);

  const isKeyConfigured = Boolean(settings.geminiApiKey?.trim());

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    await submitPrompt(prompt, {
      model: settings.preferredModel,
      temperature,
      maxOutputTokens: maxTokens,
      systemInstruction:
        settings.language === 'hi-en'
          ? 'You must respond in conversational Hinglish (Hindi written in Latin script) blending technical English terms naturally.'
          : undefined,
    });
  };

  const setPreset = (presetText: string) => {
    setPrompt(presetText);
    reset();
  };

  return (
    <Card className="flex flex-col gap-3 text-left border-blue-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Gemini Direct AI Test
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Slice 2: Direct text generation verification
            </p>
          </div>
        </div>

        <Badge variant={isKeyConfigured ? 'success' : 'warning'} size="sm">
          {isKeyConfigured ? settings.preferredModel.replace('gemini-', '') : 'No Key'}
        </Badge>
      </div>

      {!isKeyConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-900 dark:text-amber-200">
              <KeyRound className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>A Gemini API key is required to send requests.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('settings')}
              className="h-6 px-2 text-[11px] border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200"
            >
              Set Key
            </Button>
          </div>
        </div>
      )}

      {/* Preset Prompts */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-0.5">
          Try:
        </span>
        <button
          type="button"
          onClick={() => setPreset("Respond with 'OK' and latency ping.")}
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          Ping (&apos;OK&apos;)
        </button>
        <button
          type="button"
          onClick={() =>
            setPreset('Summarize the importance of human-in-the-loop AI agents in 2 sentences.')
          }
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          HITL Agents
        </button>
        <button
          type="button"
          onClick={() =>
            setPreset('Browser extensions kaise kaam karte hain? Explain in natural Hinglish.')
          }
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          Hinglish Test
        </button>
      </div>

      {/* Prompt Form */}
      <form onSubmit={handleSend} className="flex flex-col gap-2">
        <div className="relative">
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your prompt here..."
            disabled={isLoading}
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Collapsible Advanced Parameters */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 self-start"
          >
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>
              Parameters (Temp: {temperature}, Max Tokens: {maxTokens})
            </span>
          </button>

          {showAdvanced && (
            <div className="mt-2 grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="accent-blue-600"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  Max Output Tokens: {maxTokens}
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                  className="accent-blue-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={isLoading || (!result && !error)}
            className="text-xs text-slate-500 h-8 px-2"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear</span>
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            disabled={!prompt.trim() || isLoading}
            className="h-8 px-3 text-xs"
          >
            <Send className="h-3 w-3" />
            <span>Generate Text</span>
          </Button>
        </div>
      </form>

      {/* Error State Banner */}
      {error && (
        <FeedbackBanner status="error" message={error} onDismiss={reset} className="text-xs" />
      )}

      {/* Result Container */}
      {result && (
        <div className="flex flex-col gap-2 rounded-lg border border-blue-100 bg-blue-50/30 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center justify-between border-b border-blue-100/80 pb-1.5 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {result.model}
            </span>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {result.latencyMs}ms
              </span>

              {result.usageMetadata && (
                <span className="flex items-center gap-0.5">
                  <Layers className="h-2.5 w-2.5" />
                  {result.usageMetadata.totalTokenCount} tokens
                </span>
              )}
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text">
            {result.text}
          </div>
        </div>
      )}
    </Card>
  );
};

export default GeminiTestCard;
