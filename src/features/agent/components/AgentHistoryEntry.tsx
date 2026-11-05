/**
 * Sahayak Agent History Entry Component
 * Expandable card rendering a single audit log event with full metadata details.
 */

import React, { useState } from 'react';
import { ActionLogEntry } from '../types/agent-log.types';
import Badge from '@/components/common/Badge';
import {
  CheckCircle2,
  AlertOctagon,
  Eye,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Play,
  FileText,
  Compass,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface AgentHistoryEntryProps {
  entry: ActionLogEntry;
}

export const AgentHistoryEntry: React.FC<AgentHistoryEntryProps> = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const getEventIcon = () => {
    switch (entry.eventType) {
      case 'execution_completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'action_previewed':
        return <Eye className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'execution_failed':
      case 'target_not_found':
      case 'target_stale':
        return <AlertOctagon className="h-4 w-4 text-rose-500 shrink-0" />;
      case 'action_rejected':
        return <XCircle className="h-4 w-4 text-slate-400 shrink-0" />;
      case 'action_interrupted':
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'approval_granted':
        return <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />;
      case 'execution_started':
        return <Play className="h-4 w-4 text-blue-400 shrink-0" />;
      case 'instruction_received':
        return <FileText className="h-4 w-4 text-indigo-400 shrink-0" />;
      case 'planning_started':
      case 'action_proposed':
        return <Compass className="h-4 w-4 text-blue-400 shrink-0" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400 shrink-0" />;
    }
  };

  const formattedTime = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className={cn(
        'rounded-lg border text-left transition-all',
        entry.isDryRun
          ? 'border-amber-200/80 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20'
          : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
      )}
    >
      {/* Header Row */}
      <div
        className="flex cursor-pointer items-start justify-between gap-2 p-2.5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5">{getEventIcon()}</div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {entry.description}
              </span>
              {entry.isDryRun && (
                <span className="rounded bg-amber-500/10 px-1 py-0.2 font-mono text-[9px] font-bold text-amber-600 dark:text-amber-400">
                  DRY RUN
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
              <span>{formattedTime}</span>
              {entry.tabId && <span>Tab #{entry.tabId}</span>}
              {entry.actionType && (
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {entry.actionType}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {entry.risk && (
            <Badge
              variant={
                entry.risk === 'high' ? 'danger' : entry.risk === 'medium' ? 'warning' : 'neutral'
              }
              size="sm"
            >
              {entry.risk}
            </Badge>
          )}

          <button
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400 space-y-1.5">
          {entry.metadata?.userInstruction && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Instruction:{' '}
              </span>
              <span>&ldquo;{entry.metadata.userInstruction}&rdquo;</span>
            </div>
          )}

          {entry.metadata?.reason && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Rationale: </span>
              <span>{entry.metadata.reason}</span>
            </div>
          )}

          {entry.metadata?.expectedResult && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Expected: </span>
              <span>{entry.metadata.expectedResult}</span>
            </div>
          )}

          {entry.metadata?.targetActionId !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Target: </span>
              <span className="rounded bg-slate-900 px-1 py-0.2 font-mono text-[9px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                #{entry.metadata.targetActionId}
              </span>
              <span>{entry.metadata.targetElementLabel || 'Element'}</span>
              {entry.metadata.targetTagName && (
                <span className="font-mono text-slate-400">
                  &lt;{entry.metadata.targetTagName}&gt;
                </span>
              )}
            </div>
          )}

          {entry.metadata?.targetUrl && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">URL: </span>
              <span className="font-mono text-blue-600 dark:text-blue-400 truncate">
                {entry.metadata.targetUrl}
              </span>
            </div>
          )}

          {entry.metadata?.durationMs !== undefined && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Duration: </span>
              <span>{entry.metadata.durationMs}ms</span>
            </div>
          )}

          {entry.error && (
            <div className="text-rose-600 dark:text-rose-400">
              <span className="font-semibold">Error: </span>
              <span>{entry.error}</span>
            </div>
          )}

          <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Session: {entry.sessionId.slice(0, 8)}...</span>
            {entry.actionId && <span>Action: {entry.actionId.slice(0, 8)}...</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentHistoryEntry;
