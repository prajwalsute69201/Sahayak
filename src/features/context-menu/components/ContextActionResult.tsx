import React from 'react';
import {
  ContextActionPayload,
  ContextActionResult as ContextActionResultType,
} from '../types/context-menu.types';
import SelectionPreview from './SelectionPreview';
import ActionResultToolbar from './ActionResultToolbar';
import Badge from '@/components/common/Badge';
import Card from '@/components/common/Card';
import logoIcon from '@/assets/logo-icon.png';
import { HelpCircle, FileText, Languages, PenTool, AlertCircle, Clock } from 'lucide-react';

interface ContextActionResultProps {
  payload: ContextActionPayload;
  result: ContextActionResultType | null;
  isProcessing: boolean;
  streamingText: string;
  copied: boolean;
  onCopy: () => void;
  onRetry: () => void;
  onContinueInChat: () => void;
  onDismiss: () => void;
}

export const ContextActionResult: React.FC<ContextActionResultProps> = ({
  payload,
  result,
  isProcessing,
  streamingText,
  copied,
  onCopy,
  onRetry,
  onContinueInChat,
  onDismiss,
}) => {
  const getActionMeta = () => {
    switch (payload.actionType) {
      case 'explain':
        return {
          title: 'Explain Selection',
          icon: <HelpCircle className="h-4 w-4 text-blue-500" />,
        };
      case 'summarize':
        return {
          title: 'Summarize Selection',
          icon: <FileText className="h-4 w-4 text-indigo-500" />,
        };
      case 'translate':
        return {
          title: 'Translate Selection',
          icon: <Languages className="h-4 w-4 text-purple-500" />,
        };
      case 'rewrite':
        return {
          title: 'Rewrite Selection',
          icon: <PenTool className="h-4 w-4 text-emerald-500" />,
        };
      default:
        return {
          title: 'AI Quick Action',
          icon: <HelpCircle className="h-4 w-4 text-blue-500" />,
        };
    }
  };

  const displayText = result?.resultText || streamingText;
  const isError = result?.status === 'error';
  const meta = getActionMeta();

  return (
    <Card className="flex flex-col gap-2.5 border-blue-200/80 bg-white/95 p-3 text-left shadow-sm dark:border-blue-900/40 dark:bg-slate-900/95">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60">
            {meta.icon}
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{meta.title}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {result?.latencyMs && !isProcessing && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <Clock className="h-2.5 w-2.5" />
              {result.latencyMs}ms
            </span>
          )}

          <Badge variant={isError ? 'danger' : isProcessing ? 'primary' : 'success'} size="sm">
            {isError ? 'Failed' : isProcessing ? 'Generating...' : 'Done'}
          </Badge>
        </div>
      </div>

      {/* Selected Text Snippet */}
      <SelectionPreview
        text={payload.selectionText}
        sourceUrl={payload.pageUrl}
        sourceTitle={payload.pageTitle}
      />

      {/* Generated Result Box */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3 text-xs text-slate-800 shadow-2xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <div className="flex items-center gap-1.5 mb-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <img src={logoIcon} alt="Sahayak" className="h-3 w-3 object-contain" />
          <span className="uppercase tracking-wider">Sahayak Result</span>
        </div>

        {isProcessing && !displayText ? (
          <div className="flex items-center gap-2 py-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
            </span>
            <span className="text-[11px] font-medium">Processing selection with Gemini...</span>
          </div>
        ) : isError ? (
          <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
              <span>Failed to generate result</span>
            </div>
            {result?.error && <p className="mt-1 text-[11px] opacity-90">{result.error}</p>}
          </div>
        ) : (
          <div className="leading-relaxed whitespace-pre-wrap break-words">
            {displayText}
            {isProcessing && (
              <span className="inline-block h-3 w-1.5 ml-1 bg-blue-600 animate-pulse align-middle" />
            )}
          </div>
        )}
      </div>

      {/* Action Result Toolbar */}
      <ActionResultToolbar
        onCopy={onCopy}
        onRetry={onRetry}
        onContinueInChat={onContinueInChat}
        onDismiss={onDismiss}
        isCopied={copied}
        disabled={isProcessing}
      />
    </Card>
  );
};

export default ContextActionResult;
