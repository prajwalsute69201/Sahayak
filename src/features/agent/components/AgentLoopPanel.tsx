/**
 * Sahayak Single-Step Agent Loop Panel Component
 * Implements the full HITL cycle with Dry-Run Mode and Session Progress Persistence.
 */

import React, { KeyboardEvent } from 'react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import FeedbackBanner from '@/components/common/FeedbackBanner';
import EmptyState from '@/components/common/EmptyState';
import AgentApprovalCard from './AgentApprovalCard';
import AgentActionResult from './AgentActionResult';
import AgentSessionStatus from './AgentSessionStatus';
import DryRunToggle from './DryRunToggle';
import { useAgent } from '../hooks/useAgent';
import { ScannedElement } from '@/features/element-scanner';
import { Bot, Sparkles, CornerDownLeft, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';

interface AgentLoopPanelProps {
  candidates: ScannedElement[];
}

const EXAMPLE_INSTRUCTIONS = [
  'Click the search button',
  'Find the login button and click it',
  'Scroll down a little',
  'Highlight the main signup button',
  'Search button click karo',
];

export const AgentLoopPanel: React.FC<AgentLoopPanelProps> = ({ candidates }) => {
  const {
    session,
    instruction,
    isPlanning,
    isExecuting,
    proposedAction,
    lastResult,
    error,
    strongConfirmationAccepted,
    isDryRun,
    isRestored,
    isInterrupted,
    setInstruction,
    setStrongConfirmationAccepted,
    toggleDryRun,
    planAction,
    approveAndExecute,
    rejectAction,
    cancelSession,
    resetSession,
    clearError,
  } = useAgent(candidates);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (instruction.trim().length > 0 && !isPlanning && !isExecuting) {
        planAction();
      }
    }
  };

  const isInputDisabled = isPlanning || isExecuting || Boolean(proposedAction);

  return (
    <div className="flex flex-col gap-3 text-left">
      {/* Session State Badge */}
      <AgentSessionStatus
        state={session.state}
        executedCount={session.executedActions.length}
        onReset={resetSession}
      />

      {/* Dry-Run Mode Switch */}
      <DryRunToggle
        isDryRun={isDryRun}
        onToggle={toggleDryRun}
        disabled={isPlanning || isExecuting}
      />

      {/* Interruption Notice */}
      {isInterrupted && (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-bold">Session Recovered (Interrupted)</span>
              <span className="text-[11px] text-amber-800 dark:text-amber-300">
                A previous task was interrupted by browser or extension closure. Stale execution
                authority has been invalidated for safety.
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetSession}
            className="h-6 text-[10px] px-2 shrink-0 border-amber-400 text-amber-900 dark:text-amber-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Start Fresh
          </Button>
        </div>
      )}

      {/* Restored Progress Info */}
      {!isInterrupted && isRestored && session.executedActions.length > 0 && !proposedAction && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-between">
          <span>
            Restored session with <strong>{session.executedActions.length}</strong> previous
            action(s).
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSession}
            className="h-6 text-[10px] px-1.5 text-blue-600 dark:text-blue-400"
          >
            Clear Progress
          </Button>
        </div>
      )}

      {/* Instruction Input Box */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isDryRun
                ? 'Type an instruction to preview in Dry-Run mode...'
                : 'What would you like me to do next?'
            }
            className="text-xs h-9"
            disabled={isInputDisabled}
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => planAction()}
            disabled={instruction.trim().length === 0 || isInputDisabled}
            isLoading={isPlanning}
            className="h-9 px-3 text-xs font-semibold whitespace-nowrap"
          >
            {!isPlanning && <CornerDownLeft className="h-3.5 w-3.5 mr-1" />}
            {isDryRun ? 'Preview Step' : 'Plan Step'}
          </Button>
        </div>

        {/* Quick Example Chips */}
        {!proposedAction && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-left">
            <span className="flex items-center gap-1 text-[10px] text-slate-400 whitespace-nowrap">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Examples:
            </span>
            {EXAMPLE_INSTRUCTIONS.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setInstruction(ex);
                  planAction(ex);
                }}
                disabled={isInputDisabled}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 whitespace-nowrap dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/60 dark:hover:text-blue-300"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error feedback */}
      {error && <FeedbackBanner status="error" message={error} onDismiss={clearError} />}

      {/* Human-in-the-Loop Approval Card */}
      {proposedAction && (
        <AgentApprovalCard
          action={proposedAction}
          isExecuting={isExecuting}
          isDryRun={isDryRun}
          strongConfirmationAccepted={strongConfirmationAccepted}
          onStrongConfirmationChange={setStrongConfirmationAccepted}
          onApprove={approveAndExecute}
          onReject={rejectAction}
          onCancel={cancelSession}
        />
      )}

      {/* Last Action Execution Result */}
      {lastResult && !proposedAction && (
        <AgentActionResult
          result={lastResult}
          onContinue={() => {
            setInstruction('');
          }}
        />
      )}

      {/* Explanatory Empty State when Idle */}
      {!proposedAction && !lastResult && !isPlanning && (
        <EmptyState
          icon={Bot}
          title="Single-Step Agent (HITL)"
          description="Give Sahayak an instruction. The agent will propose exactly one browser action and wait for your explicit approval before executing it."
          className="py-6"
        >
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-left dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Strict HITL Safety Principles:</span>
            </div>
            <ul className="mt-1.5 space-y-1 text-[11px] text-slate-500 dark:text-slate-400 list-disc list-inside">
              <li>One approval authorizes exactly one action</li>
              <li>Zero autonomous multi-step loops without user clicks</li>
              <li>Dry-Run mode lets you simulate safely before live interaction</li>
              <li>Target elements are visually highlighted prior to execution</li>
              <li>Zero raw code execution (all actions use verified native DOM APIs)</li>
            </ul>
          </div>
        </EmptyState>
      )}
    </div>
  );
};

export default AgentLoopPanel;
