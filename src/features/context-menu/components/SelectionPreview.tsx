import React, { useState } from 'react';
import { Quote, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SelectionPreviewProps {
  text: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export const SelectionPreview: React.FC<SelectionPreviewProps> = ({
  text,
  sourceUrl,
  sourceTitle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const isLong = text.length > 220;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 text-left text-xs dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
        <div className="flex items-center gap-1">
          <Quote className="h-3 w-3 text-blue-500 shrink-0" />
          <span className="uppercase tracking-wider">Selected Text</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span>{words} words</span>
          <span>•</span>
          <span>{chars} chars</span>
        </div>
      </div>

      <div
        className={cn(
          'text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic border-l-2 border-blue-400 pl-2 my-1 break-words',
          !isExpanded && isLong && 'line-clamp-3'
        )}
      >
        &ldquo;{text}&rdquo;
      </div>

      <div className="flex items-center justify-between mt-1.5 pt-1 text-[10px] text-slate-400 dark:text-slate-500">
        <span className="truncate max-w-[200px]" title={sourceUrl || sourceTitle}>
          {sourceTitle || (sourceUrl ? new URL(sourceUrl).hostname : 'Web Page')}
        </span>

        {isLong && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-0.5 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors shrink-0"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="h-2.5 w-2.5" />
              </>
            ) : (
              <>
                Show full <ChevronDown className="h-2.5 w-2.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default SelectionPreview;
