import React from 'react';
import { ChatMessage as ChatMessageType } from '../types/chat.types';
import logoIcon from '@/assets/logo-icon.png';
import { User, AlertCircle, RefreshCw, BookmarkCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRetry }) => {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isInterrupted = message.status === 'interrupted';

  /**
   * Simple markdown formatter for clean text rendering without extra bloated dependencies
   */
  const renderFormattedContent = (text: string) => {
    if (!text) return null;

    // Split paragraphs
    const paragraphs = text.split(/\n\n+/);

    return paragraphs.map((para, pIdx) => {
      // Check for bullet lists
      if (para.includes('\n- ') || para.startsWith('- ') || para.startsWith('* ')) {
        const items = para.split(/\n[-*]\s+/).filter(Boolean);
        return (
          <ul key={pIdx} className="list-disc pl-4 space-y-1 my-1.5 text-xs">
            {items.map((item, iIdx) => (
              <li key={iIdx}>{formatInline(item)}</li>
            ))}
          </ul>
        );
      }

      // Check for numbered lists
      if (/^\d+\.\s+/.test(para)) {
        const items = para.split(/\n\d+\.\s+/).filter(Boolean);
        return (
          <ol key={pIdx} className="list-decimal pl-4 space-y-1 my-1.5 text-xs">
            {items.map((item, iIdx) => (
              <li key={iIdx}>{formatInline(item)}</li>
            ))}
          </ol>
        );
      }

      // Check for heading (### or ##)
      if (para.startsWith('### ')) {
        return (
          <h4 key={pIdx} className="font-bold text-xs mt-2 mb-1 text-slate-900 dark:text-slate-100">
            {formatInline(para.slice(4))}
          </h4>
        );
      }
      if (para.startsWith('## ')) {
        return (
          <h3 key={pIdx} className="font-bold text-sm mt-2 mb-1 text-slate-900 dark:text-slate-100">
            {formatInline(para.slice(3))}
          </h3>
        );
      }

      // Standard paragraph
      return (
        <p key={pIdx} className="my-1 text-xs leading-relaxed">
          {formatInline(para)}
        </p>
      );
    });
  };

  /**
   * Formats bold, code, and citations inline
   */
  const formatInline = (text: string): React.ReactNode => {
    // Replace citations [Section: ...] with styled badges
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[Section:.*?\])/g);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-mono text-blue-600 dark:bg-slate-800 dark:text-blue-400"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('[Section:') && part.endsWith(']')) {
        const sectionName = part.replace(/^\[Section:\s*/, '').replace(/\]$/, '');
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.2 text-[10px] font-medium text-blue-700 dark:bg-blue-950/80 dark:text-blue-300"
          >
            <BookmarkCheck className="h-2.5 w-2.5" />
            {sectionName}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={cn(
        'flex w-full gap-2.5 text-left transition-all',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-900/30">
          <img src={logoIcon} alt="Sahayak AI" className="h-4 w-4 object-contain" />
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={cn(
          'relative flex max-w-[85%] flex-col rounded-2xl px-3.5 py-2.5 shadow-2xs',
          isUser
            ? 'rounded-tr-xs bg-blue-600 text-white font-medium'
            : 'rounded-tl-xs border border-slate-200/90 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
        )}
      >
        {/* Message Content */}
        <div className="break-words">{renderFormattedContent(message.content)}</div>

        {/* Source References Pills */}
        {!isUser && message.sourceSections && message.sourceSections.length > 0 && (
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              Sources:
            </span>
            {message.sourceSections.map((sec, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.2 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <BookmarkCheck className="h-2.5 w-2.5 text-blue-500" />
                {sec}
              </span>
            ))}
          </div>
        )}

        {/* Interrupted Generation Notice */}
        {isInterrupted && (
          <div className="mt-1 text-[10px] italic text-amber-600 dark:text-amber-400">
            Generation stopped by user
          </div>
        )}

        {/* Error Notice with Retry */}
        {isError && (
          <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <span>Failed to generate answer</span>
            </div>
            {message.error && <p className="mt-1 text-[11px] opacity-90">{message.error}</p>}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Retry Question
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <User className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
