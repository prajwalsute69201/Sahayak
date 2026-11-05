/**
 * Sahayak SkillExecutionHistory Component
 * Displays execution records, duration statistics, status badges, and error diagnostics.
 */

import React, { useState } from 'react';
import { Clock, CheckCircle2, AlertCircle, Trash2, RotateCcw, History } from 'lucide-react';
import { useSkillHistory } from '../hooks/useSkillHistory';
import { SkillExecutionRecord } from '../types/skill.types';

interface SkillExecutionHistoryProps {
  onRetry?: (record: SkillExecutionRecord) => void;
}

export const SkillExecutionHistory: React.FC<SkillExecutionHistoryProps> = ({ onRetry }) => {
  const { history, isLoading, clearHistory } = useSkillHistory();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Execution History ({history.length})
          </h4>
        </div>

        {history.length > 0 &&
          (showClearConfirm ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-rose-600">Clear all?</span>
              <button
                onClick={async () => {
                  await clearHistory();
                  setShowClearConfirm(false);
                }}
                className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-rose-700"
              >
                Yes
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          ))}
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-xs text-slate-400">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No skills have been executed yet. Run a skill to see history logs here.
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {history.map((record) => {
            const isSuccess = record.status === 'completed';
            const isFailed = record.status === 'failed';
            const dateStr = new Date(record.startedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={record.executionId}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isSuccess ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {record.skillName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
                    {record.durationMs && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {(record.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    <span>{dateStr}</span>
                  </div>
                </div>

                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 italic truncate">
                  &ldquo;{record.renderedInstruction}&rdquo;
                </p>

                {record.outputSummary && (
                  <p className="mt-1 rounded bg-white p-1.5 text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-300 line-clamp-2">
                    {record.outputSummary}
                  </p>
                )}

                {isFailed && record.error && (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                    {record.error}
                  </p>
                )}

                {onRetry && (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => onRetry(record)}
                      className="inline-flex items-center gap-1 rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Rerun
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
