/**
 * Sahayak Agent Session Status Component
 * Displays the current step state and executed action count.
 */

import React from 'react';
import { AgentSessionState } from '../types/agent.types';
import Badge from '@/components/common/Badge';
import { Bot, Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface AgentSessionStatusProps {
  state: AgentSessionState;
  executedCount: number;
  onReset: () => void;
}

export const AgentSessionStatus: React.FC<AgentSessionStatusProps> = ({
  state,
  executedCount,
  onReset,
}) => {
  const stateBadge = {
    idle: { label: 'Ready', variant: 'neutral' as const, icon: Bot },
    planning: { label: 'Planning Step...', variant: 'primary' as const, icon: Loader2 },
    awaiting_approval: {
      label: 'Awaiting Your Approval',
      variant: 'warning' as const,
      icon: AlertCircle,
    },
    executing: { label: 'Executing Action...', variant: 'primary' as const, icon: Loader2 },
    completed: { label: 'Step Complete', variant: 'success' as const, icon: CheckCircle2 },
    failed: { label: 'Action Failed', variant: 'danger' as const, icon: XCircle },
    cancelled: { label: 'Cancelled', variant: 'neutral' as const, icon: XCircle },
    interrupted: { label: 'Interrupted', variant: 'warning' as const, icon: AlertCircle },
  }[state];

  const StateIcon = stateBadge.icon;
  const isSpinning = state === 'planning' || state === 'executing';

  return (
    <div className="flex items-center justify-between text-xs px-0.5">
      <div className="flex items-center gap-1.5">
        <Badge variant={stateBadge.variant} size="sm">
          <StateIcon className={`mr-1 h-3 w-3 ${isSpinning ? 'animate-spin' : ''}`} />
          {stateBadge.label}
        </Badge>
        {executedCount > 0 && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            ({executedCount} {executedCount === 1 ? 'action' : 'actions'} executed)
          </span>
        )}
      </div>

      {(state === 'completed' || state === 'cancelled' || state === 'failed') && (
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          New Task
        </button>
      )}
    </div>
  );
};

export default AgentSessionStatus;
