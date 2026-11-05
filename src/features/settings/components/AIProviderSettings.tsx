/**
 * AI Provider Settings Component
 * Manages Gemini and Groq API keys, model selections, fallback toggles, and connection tests.
 */

import React, { useState } from 'react';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Toggle from '@/components/common/Toggle';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { UserSettings } from '@/types/settings.types';
import { geminiClient } from '@/services/gemini';
import { groqClient } from '@/services/groq';
import { GEMINI_CONFIG, GROQ_CONFIG } from '@/services/ai/ai-provider.config';
import { Zap, ExternalLink, Check, Sparkles, Layers, Server } from 'lucide-react';

interface AIProviderSettingsProps {
  settings: UserSettings;
  onChange: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export const AIProviderSettings: React.FC<AIProviderSettingsProps> = ({ settings, onChange }) => {
  // Test connection state for Gemini
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<{
    status: 'idle' | 'success' | 'error';
    latencyMs?: number;
    message?: string;
  }>({ status: 'idle' });

  // Test connection state for Groq
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqResult, setGroqResult] = useState<{
    status: 'idle' | 'success' | 'error';
    latencyMs?: number;
    message?: string;
  }>({ status: 'idle' });

  const handleTestGemini = async () => {
    if (!settings.geminiApiKey) {
      setGeminiResult({ status: 'error', message: 'Please enter a Gemini API Key to test.' });
      return;
    }
    setTestingGemini(true);
    setGeminiResult({ status: 'idle' });
    try {
      const res = await geminiClient.validateApiKey(settings.geminiApiKey);
      if (res.valid) {
        setGeminiResult({
          status: 'success',
          latencyMs: res.latencyMs,
          message: `Connected in ${res.latencyMs}ms`,
        });
      } else {
        setGeminiResult({ status: 'error', message: res.error || 'Connection failed' });
      }
    } catch (err) {
      setGeminiResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestGroq = async () => {
    if (!settings.groqApiKey) {
      setGroqResult({ status: 'error', message: 'Please enter a Groq API Key to test.' });
      return;
    }
    setTestingGroq(true);
    setGroqResult({ status: 'idle' });
    try {
      const res = await groqClient.validateApiKey(settings.groqApiKey);
      if (res.valid) {
        setGroqResult({
          status: 'success',
          latencyMs: res.latencyMs,
          message: `Connected in ${res.latencyMs}ms`,
        });
      } else {
        setGroqResult({ status: 'error', message: res.error || 'Connection failed' });
      }
    } catch (err) {
      setGroqResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setTestingGroq(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Primary Provider Selection */}
      <Card className="flex flex-col gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-500" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Primary AI Provider
            </h4>
          </div>
          <Badge variant="neutral" size="sm">
            {settings.primaryProvider === 'groq' ? 'Groq Cloud' : 'Google Gemini'}
          </Badge>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Select which AI engine handles your queries first. When automatic fallback is enabled,
          Sahayak automatically switches to the secondary provider if the primary encounters rate
          limits.
        </p>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            type="button"
            onClick={() => onChange('primaryProvider', 'gemini')}
            className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
              settings.primaryProvider === 'gemini'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold">Google Gemini</span>
              {settings.primaryProvider === 'gemini' && (
                <Check className="h-3.5 w-3.5 text-blue-600" />
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Multimodal Vision, SSE Streaming & Grounding
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChange('primaryProvider', 'groq')}
            className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
              settings.primaryProvider === 'groq'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold">Groq Cloud</span>
              {settings.primaryProvider === 'groq' && (
                <Check className="h-3.5 w-3.5 text-blue-600" />
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Ultra-fast LPU inference (Llama 3.3)
            </span>
          </button>
        </div>
      </Card>

      {/* 2. Google Gemini Card */}
      <Card className="flex flex-col gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Google Gemini Configuration
            </h4>
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400"
          >
            Get Key <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="space-y-2">
          <Input
            id="gemini-api-key"
            label="Gemini API Key"
            type="password"
            placeholder="AIzaSy..."
            value={settings.geminiApiKey}
            onChange={(e) => onChange('geminiApiKey', e.target.value)}
          />

          <Select
            id="gemini-model"
            label="Default Gemini Model"
            value={settings.geminiModel || GEMINI_CONFIG.defaultModel}
            onChange={(e) => onChange('geminiModel', e.target.value)}
            options={GEMINI_CONFIG.models.map((m) => ({ value: m.id, label: m.name }))}
          />

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestGemini}
              disabled={testingGemini || !settings.geminiApiKey}
              className="text-xs"
            >
              <Zap className="h-3.5 w-3.5 mr-1 text-amber-500" />
              {testingGemini ? 'Testing Connection...' : 'Test Connection'}
            </Button>

            {geminiResult.status === 'success' && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                {geminiResult.message}
              </span>
            )}
            {geminiResult.status === 'error' && (
              <span className="text-[11px] font-medium text-red-600 dark:text-red-400 truncate max-w-[180px]">
                {geminiResult.message}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* 3. Groq Fallback Card */}
      <Card className="flex flex-col gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Groq Fallback Configuration
            </h4>
          </div>
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Get Key <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Fallback toggle */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-slate-200/60 dark:border-slate-700/60">
          <Toggle
            id="enable-fallback-toggle"
            label="Automatic Fallback Cascade"
            description="Automatically route requests to Groq when Gemini encounters HTTP 429 rate limits or outages"
            checked={settings.enableFallback !== false}
            onChange={(checked) => onChange('enableFallback', checked)}
          />
        </div>

        <div className="space-y-2">
          <Input
            id="groq-api-key"
            label="Groq API Key (Optional Fallback)"
            type="password"
            placeholder="gsk_..."
            value={settings.groqApiKey || ''}
            onChange={(e) => onChange('groqApiKey', e.target.value)}
          />

          <Select
            id="groq-model"
            label="Default Groq Model"
            value={settings.groqModel || GROQ_CONFIG.defaultModel}
            onChange={(e) => onChange('groqModel', e.target.value)}
            options={GROQ_CONFIG.models.map((m) => ({ value: m.id, label: m.name }))}
          />

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestGroq}
              disabled={testingGroq || !settings.groqApiKey}
              className="text-xs"
            >
              <Zap className="h-3.5 w-3.5 mr-1 text-indigo-500" />
              {testingGroq ? 'Testing Connection...' : 'Test Connection'}
            </Button>

            {groqResult.status === 'success' && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                {groqResult.message}
              </span>
            )}
            {groqResult.status === 'error' && (
              <span className="text-[11px] font-medium text-red-600 dark:text-red-400 truncate max-w-[180px]">
                {groqResult.message}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIProviderSettings;
