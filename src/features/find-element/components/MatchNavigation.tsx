/**
 * Sahayak Match Navigation Component
 * Allows users to traverse between multiple matching elements and center them on screen.
 */

import React from 'react';
import Button from '@/components/common/Button';
import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';

interface MatchNavigationProps {
  currentIndex: number;
  totalMatches: number;
  onPrev: () => void;
  onNext: () => void;
  onLocate: () => void;
}

export const MatchNavigation: React.FC<MatchNavigationProps> = ({
  currentIndex,
  totalMatches,
  onPrev,
  onNext,
  onLocate,
}) => {
  if (totalMatches <= 1) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          Match {currentIndex + 1} of {totalMatches}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onLocate}
          className="h-6 px-1.5 text-[10px]"
          title="Scroll and center match in view"
        >
          <Crosshair className="h-3 w-3 mr-1 text-blue-500" />
          Center
        </Button>

        <button
          type="button"
          onClick={onPrev}
          disabled={totalMatches <= 1}
          className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          title="Previous matching element"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={totalMatches <= 1}
          className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          title="Next matching element"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default MatchNavigation;
