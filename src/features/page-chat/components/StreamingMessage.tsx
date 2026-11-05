import React from 'react';
import logoIcon from '@/assets/logo-icon.png';
import { Square } from 'lucide-react';

interface StreamingMessageProps {
  content: string;
  onStop: () => void;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({ content, onStop }) => {
  return (
    <div className="flex w-full justify-start gap-2.5 text-left transition-all">
      {/* Assistant Avatar */}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-900/30">
        <img src={logoIcon} alt="Sahayak AI" className="h-4 w-4 object-contain" />
      </div>

      {/* Bubble Container */}
      <div className="relative flex max-w-[85%] flex-col rounded-2xl rounded-tl-xs border border-blue-200/80 bg-white px-3.5 py-2.5 shadow-2xs dark:border-blue-900/40 dark:bg-slate-900">
        {content ? (
          <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
            {content}
            <span className="inline-block h-3 w-1.5 ml-1 bg-blue-600 dark:bg-blue-400 animate-pulse align-middle" />
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
            </span>
            <span className="text-[11px] font-medium">Sahayak is grounding response...</span>
          </div>
        )}

        {/* Stop Generation Button */}
        <div className="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Streaming from Gemini...
          </span>
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
            title="Stop generation"
            aria-label="Stop generation"
          >
            <Square className="h-2.5 w-2.5 fill-current text-red-500" />
            Stop
          </button>
        </div>
      </div>
    </div>
  );
};

export default StreamingMessage;
