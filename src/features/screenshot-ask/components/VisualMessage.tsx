/**
 * Visual Message Component
 * Renders user questions and AI multimodal responses with copy actions,
 * OCR distinctions, and latency metrics.
 */

import React, { useState } from 'react';
import { VisualChatMessage } from '../types/screenshot.types';
import logoIcon from '@/assets/logo-icon.png';
import { User, Copy, Check, FileText, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

interface VisualMessageProps {
  message: VisualChatMessage;
  isStreaming?: boolean;
}

export const VisualMessage: React.FC<VisualMessageProps> = ({ message, isStreaming = false }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  /**
   * Inline text styling for bold, code, and links
   */
  const formatInline = (text: string) => {
    // Replace **bold**
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-slate-900 dark:text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px] text-blue-600 dark:bg-slate-800 dark:text-blue-400"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  /**
   * Paragraph & list formatter
   */
  const renderFormattedContent = (text: string) => {
    if (!text) return null;

    const paragraphs = text.split(/\n\n+/);

    return paragraphs.map((para, pIdx) => {
      // Bullet list
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

      // Numbered list
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

      // Heading 3
      if (para.startsWith('### ')) {
        return (
          <h4 key={pIdx} className="font-bold text-xs mt-2 mb-1 text-slate-900 dark:text-slate-100">
            {formatInline(para.slice(4))}
          </h4>
        );
      }

      // Heading 2
      if (para.startsWith('## ')) {
        return (
          <h3
            key={pIdx}
            className="font-bold text-sm mt-2.5 mb-1 text-slate-900 dark:text-slate-100"
          >
            {formatInline(para.slice(3))}
          </h3>
        );
      }

      return (
        <p key={pIdx} className="text-xs leading-relaxed my-1">
          {formatInline(para)}
        </p>
      );
    });
  };

  return (
    <div
      className={cn(
        'group flex w-full gap-2.5 transition-opacity',
        isUser ? 'flex-row-reverse justify-start' : 'flex-row justify-start'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs shadow-2xs select-none',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white p-1 border border-slate-200 dark:border-slate-800 dark:bg-slate-900'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <img src={logoIcon} alt="Sahayak" className="h-5 w-5 object-contain" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'relative flex max-w-[85%] flex-col rounded-2xl px-3.5 py-2.5 shadow-2xs',
          isUser
            ? 'bg-blue-600 text-white rounded-tr-xs'
            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800'
        )}
      >
        {/* Header tag for OCR or Latency */}
        {!isUser && (
          <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
            <div className="flex items-center gap-1">
              {message.isOcr ? (
                <span className="flex items-center gap-0.5 text-indigo-500 font-semibold">
                  <FileText className="h-3 w-3" />
                  Extracted Text (OCR)
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-blue-500 font-semibold">
                  <Sparkles className="h-3 w-3" />
                  Gemini Vision
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {message.latencyMs && (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {message.latencyMs}ms
                </span>
              )}

              <button
                type="button"
                onClick={handleCopy}
                title="Copy text"
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-slate-700 dark:hover:text-slate-200"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="break-words">
          {renderFormattedContent(message.text)}

          {isStreaming && (
            <span className="inline-block h-3.5 w-1.5 animate-pulse bg-blue-500 align-middle ml-1" />
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualMessage;
