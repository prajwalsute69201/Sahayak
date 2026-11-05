/**
 * Sahayak Scan Summary Component
 * Renders statistical category counts with interactive filter tabs.
 */

import React from 'react';
import {
  ScanSummary as ScanSummaryType,
  ElementCategory,
  CATEGORY_BADGE_CONFIGS,
} from '../types/element-scanner.types';
import { cn } from '@/utils/cn';

interface ScanSummaryProps {
  summary: ScanSummaryType;
  activeFilter: ElementCategory | 'all';
  onSelectFilter: (category: ElementCategory | 'all') => void;
}

export const ScanSummaryView: React.FC<ScanSummaryProps> = ({
  summary,
  activeFilter,
  onSelectFilter,
}) => {
  const categories = Object.keys(summary.categories) as ElementCategory[];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Categories Breakdown
        </span>
        <button
          onClick={() => onSelectFilter('all')}
          className={cn(
            'text-[11px] px-2 py-0.5 rounded-full transition-colors font-medium',
            activeFilter === 'all'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          All ({summary.totalCount})
        </button>
      </div>

      {/* Category Pills Grid */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {categories.map((cat) => {
          const count = summary.categories[cat];
          if (count === 0 && activeFilter !== cat) return null;

          const config = CATEGORY_BADGE_CONFIGS[cat];
          const isSelected = activeFilter === cat;

          return (
            <button
              key={cat}
              onClick={() => onSelectFilter(isSelected ? 'all' : cat)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all border',
                isSelected
                  ? 'border-transparent font-semibold shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
              style={
                isSelected
                  ? {
                      backgroundColor: config.backgroundColor,
                      color: config.textColor,
                    }
                  : undefined
              }
              title={config.description}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: isSelected ? '#ffffff' : config.backgroundColor,
                }}
              />
              <span>{config.label}</span>
              <span
                className={cn(
                  'rounded-full px-1 text-[10px] font-bold',
                  isSelected
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ScanSummaryView;
