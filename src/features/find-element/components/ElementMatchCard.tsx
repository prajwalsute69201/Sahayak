/**
 * Sahayak Element Match Card Component
 * Displays match details, confidence score, source, reasoning, and highlight action.
 */

import React from 'react';
import { ElementMatch } from '../types/find-element.types';
import { CATEGORY_BADGE_CONFIGS } from '@/features/element-scanner';
import { Eye, EyeOff, Sparkles, Cpu, Layers } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ElementMatchCardProps {
  match: ElementMatch;
  rank: number;
  isHighlighted: boolean;
  onHighlight: (actionId: number) => void;
}

export const ElementMatchCard: React.FC<ElementMatchCardProps> = ({
  match,
  rank,
  isHighlighted,
  onHighlight,
}) => {
  const { element, confidence, reason, source } = match;
  const config = CATEGORY_BADGE_CONFIGS[element.category] || CATEGORY_BADGE_CONFIGS.other;

  // Confidence styling
  const confidencePercent = Math.round(confidence * 100);
  const confidenceBadge =
    confidencePercent >= 85
      ? {
          label: `${confidencePercent}% High`,
          style:
            'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300',
        }
      : confidencePercent >= 65
        ? {
            label: `${confidencePercent}% Medium`,
            style:
              'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300',
          }
        : {
            label: `${confidencePercent}% Low`,
            style:
              'bg-slate-100 text-slate-600 ring-1 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
          };

  // Match source icon and text
  const sourceConfig = {
    ai: { label: 'AI Match', icon: Sparkles },
    local: { label: 'Local Match', icon: Cpu },
    hybrid: { label: 'Hybrid Match', icon: Layers },
  }[source];
  const SourceIcon = sourceConfig.icon;

  return (
    <div
      onClick={() => onHighlight(match.actionId)}
      className={cn(
        'group flex flex-col gap-2 rounded-xl border p-3 transition-all cursor-pointer text-left',
        isHighlighted
          ? 'border-blue-500 bg-blue-50/70 shadow-sm dark:border-blue-500 dark:bg-blue-950/40 ring-1 ring-blue-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-850'
      )}
    >
      {/* Header row: Rank, ActionID, Category, Confidence */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {rank === 1 ? (
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
              ★ Best Match
            </span>
          ) : (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              #{rank}
            </span>
          )}

          {/* Action ID */}
          <span className="flex h-4 items-center justify-center rounded bg-slate-900 px-1.5 text-[9px] font-extrabold text-white dark:bg-slate-100 dark:text-slate-900">
            #{element.actionId}
          </span>

          {/* Category Pill */}
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs"
            style={{ backgroundColor: config.backgroundColor }}
          >
            {config.shortCode}
          </span>
        </div>

        {/* Confidence & Source */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
              confidenceBadge.style
            )}
          >
            {confidenceBadge.label}
          </span>

          {/* Highlight Trigger Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHighlight(match.actionId);
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
      </div>

      {/* Accessible Label / Name */}
      <div>
        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
          {element.label}
        </div>
        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          &lt;{element.tagName}
          {element.type ? ` type="${element.type}"` : ''}&gt;
        </div>
      </div>

      {/* Rationale & Source Tag */}
      <div className="flex items-start gap-1.5 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
        <SourceIcon className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
        <span className="leading-snug">{reason}</span>
      </div>
    </div>
  );
};

export default ElementMatchCard;
