import React from 'react';
import { Copy, Check, RefreshCw, MessageSquare, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ActionResultToolbarProps {
  onCopy: () => void;
  onRetry: () => void;
  onContinueInChat: () => void;
  onDismiss: () => void;
  isCopied: boolean;
  disabled?: boolean;
}

export const ActionResultToolbar: React.FC<ActionResultToolbarProps> = ({
  onCopy,
  onRetry,
  onContinueInChat,
  onDismiss,
  isCopied,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center gap-1.5">
        {/* Copy Result Button */}
        <button
          type="button"
          onClick={onCopy}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shadow-2xs',
            isCopied
              ? 'bg-emerald-600 text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          title="Copy result to clipboard"
        >
          {isCopied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-slate-500" />
              <span>Copy</span>
            </>
          )}
        </button>

        {/* Retry Button */}
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all shadow-2xs',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          title="Retry this action"
        >
          <RefreshCw className="h-3 w-3 text-slate-500" />
          <span>Retry</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Continue in Page Chat */}
        <button
          type="button"
          onClick={onContinueInChat}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-all shadow-2xs',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          title="Continue conversation in Page Chat"
        >
          <MessageSquare className="h-3 w-3" />
          <span>Continue in Chat</span>
        </button>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Dismiss result"
          aria-label="Dismiss result"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ActionResultToolbar;
