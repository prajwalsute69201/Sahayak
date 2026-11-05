/**
 * Sahayak Agent Action Result Component
 * Renders verified telemetry after executing an approved single-step action.
 */

import React from 'react';
import { ActionExecutionResult } from '../types/agent.types';
import Badge from '@/components/common/Badge';
import { CheckCircle2, AlertOctagon, Clock, HelpCircle, Eye } from 'lucide-react';

interface AgentActionResultProps {
  result: ActionExecutionResult;
  onContinue: () => void;
}

export const AgentActionResult: React.FC<AgentActionResultProps> = ({ result, onContinue }) => {
  const isSuccess = result.status === 'success' || result.status === 'preview_only';

  const statusConfig = {
    success: {
      label: 'Executed Successfully',
      variant: 'success' as const,
      icon: CheckCircle2,
      border: 'border-emerald-200 dark:border-emerald-900',
      bg: 'bg-emerald-50/60 dark:bg-emerald-950/30',
    },
    preview_only: {
      label: 'Dry-Run Preview (Simulated)',
      variant: 'warning' as const,
      icon: Eye,
      border: 'border-amber-200 dark:border-amber-900',
      bg: 'bg-amber-50/60 dark:bg-amber-950/30',
    },
    interrupted: {
      label: 'Action Interrupted',
      variant: 'warning' as const,
      icon: AlertOctagon,
      border: 'border-slate-300 dark:border-slate-800',
      bg: 'bg-slate-100 dark:bg-slate-900/50',
    },
    failed: {
      label: 'Execution Failed',
      variant: 'danger' as const,
      icon: AlertOctagon,
      border: 'border-red-200 dark:border-red-900',
      bg: 'bg-red-50/60 dark:bg-red-950/30',
    },
    target_not_found: {
      label: 'Target Not Found',
      variant: 'warning' as const,
      icon: AlertOctagon,
      border: 'border-amber-200 dark:border-amber-900',
      bg: 'bg-amber-50/60 dark:bg-amber-950/30',
    },
    stale_target: {
      label: 'Stale / Detached Target',
      variant: 'warning' as const,
      icon: AlertOctagon,
      border: 'border-amber-200 dark:border-amber-900',
      bg: 'bg-amber-50/60 dark:bg-amber-950/30',
    },
    cancelled: {
      label: 'Execution Cancelled',
      variant: 'neutral' as const,
      icon: HelpCircle,
      border: 'border-slate-200 dark:border-slate-800',
      bg: 'bg-slate-50 dark:bg-slate-900/50',
    },
    verification_uncertain: {
      label: 'Verification Uncertain',
      variant: 'warning' as const,
      icon: HelpCircle,
      border: 'border-amber-200 dark:border-amber-900',
      bg: 'bg-amber-50/60 dark:bg-amber-950/30',
    },
  }[result.status] || {
    label: result.status,
    variant: 'neutral' as const,
    icon: HelpCircle,
    border: 'border-slate-200 dark:border-slate-800',
    bg: 'bg-slate-50 dark:bg-slate-900/50',
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 text-left ${statusConfig.border} ${statusConfig.bg}`}
    >
      <div className="flex items-center justify-between">
        <Badge variant={statusConfig.variant} size="sm">
          <StatusIcon className="mr-1 h-3 w-3" />
          {statusConfig.label}
        </Badge>
        <span className="flex items-center text-[10px] text-slate-400">
          <Clock className="mr-1 h-3 w-3" />
          {result.durationMs}ms
        </span>
      </div>

      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
        {result.message}
      </p>

      {result.urlAfter && result.urlBefore && result.urlAfter !== result.urlBefore && (
        <div className="rounded bg-white/80 p-1.5 text-[11px] font-mono text-slate-600 dark:bg-slate-900 dark:text-slate-400 truncate">
          Navigated to: {result.urlAfter}
        </div>
      )}

      {isSuccess && (
        <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Step complete. Ready for your next instruction.
          </span>
          <button
            type="button"
            onClick={onContinue}
            className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
          >
            Next Step &rarr;
          </button>
        </div>
      )}
    </div>
  );
};

export default AgentActionResult;
