/**
 * Sahayak DryRunToggle Component
 * Provides a user-facing control to toggle non-destructive simulation mode.
 */

import React from 'react';
import { Eye, ShieldAlert } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DryRunToggleProps {
  isDryRun: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const DryRunToggle: React.FC<DryRunToggleProps> = ({ isDryRun, onToggle, disabled }) => {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-1.5 text-left">
        {isDryRun ? (
          <Eye className="h-3.5 w-3.5 text-amber-500 shrink-0 animate-pulse" />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              Dry-Run Mode
            </span>
            {isDryRun && (
              <span className="rounded bg-amber-500/10 px-1 py-0.2 font-mono text-[9px] font-bold text-amber-600 dark:text-amber-400">
                PREVIEW ONLY
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {isDryRun
              ? 'Preview actions safely without touching the page'
              : 'Live execution enabled with explicit HITL approval'}
          </span>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isDryRun}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          'relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50',
          isDryRun ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out',
            isDryRun ? 'translate-x-3.5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
};

export default DryRunToggle;
