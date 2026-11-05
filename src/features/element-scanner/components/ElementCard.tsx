/**
 * Sahayak Element Card Component
 * Displays structured metadata for a single scanned element with interactive highlighting.
 */

import React from 'react';
import { ScannedElement, CATEGORY_BADGE_CONFIGS } from '../types/element-scanner.types';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ElementCardProps {
  element: ScannedElement;
  isHighlighted: boolean;
  onHighlight: (actionId: number) => void;
}

export const ElementCard: React.FC<ElementCardProps> = ({
  element,
  isHighlighted,
  onHighlight,
}) => {
  const config = CATEGORY_BADGE_CONFIGS[element.category] || CATEGORY_BADGE_CONFIGS.other;

  return (
    <div
      onClick={() => onHighlight(element.actionId)}
      className={cn(
        'group flex flex-col gap-1.5 rounded-xl border p-2.5 transition-all cursor-pointer text-left',
        isHighlighted
          ? 'border-blue-500 bg-blue-50/70 shadow-sm dark:border-blue-500 dark:bg-blue-950/40 ring-1 ring-blue-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-850'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Action ID Pill */}
          <span className="flex h-5 items-center justify-center rounded-md bg-slate-900 px-1.5 text-[10px] font-extrabold text-white dark:bg-slate-100 dark:text-slate-900">
            #{element.actionId}
          </span>

          {/* Category Badge */}
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
            style={{ backgroundColor: config.backgroundColor }}
          >
            {config.shortCode}
          </span>

          {/* HTML Tag & Type */}
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            &lt;{element.tagName}
            {element.type ? ` type="${element.type}"` : ''}&gt;
          </span>
        </div>

        {/* Highlight Trigger Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHighlight(element.actionId);
          }}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
            isHighlighted
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          )}
          title={isHighlighted ? 'Clear highlight' : 'Highlight on page'}
        >
          {isHighlighted ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Accessible Label / Text */}
      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
        {element.label}
      </div>

      {/* Secondary details (attributes, selector, state) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
        {!element.isEnabled && (
          <span className="rounded bg-red-100 px-1 py-0.2 font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300">
            Disabled
          </span>
        )}

        {element.placeholder && (
          <span className="truncate max-w-[130px]" title={element.placeholder}>
            ph: &quot;{element.placeholder}&quot;
          </span>
        )}

        {element.name && <span>name: {element.name}</span>}

        {element.selector && (
          <span
            className="font-mono text-slate-400 dark:text-slate-500 truncate max-w-[150px]"
            title={element.selector}
          >
            {element.selector}
          </span>
        )}
      </div>
    </div>
  );
};

export default ElementCard;
