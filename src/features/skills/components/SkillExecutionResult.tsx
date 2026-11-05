/**
 * Sahayak SkillExecutionResult Component
 * Displays the result of a skill execution, including formatted text outputs,
 * agent action proposals with HITL approval, duration metrics, and clipboard copy.
 */

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Copy, Check, X, Clock, ExternalLink, Bot } from 'lucide-react';
import { SkillExecutionOutput } from '../services/skill-execution.service';
import { AgentApprovalCard } from '@/features/agent/components/AgentApprovalCard';
import { useAgent } from '@/features/agent/hooks/useAgent';

interface SkillExecutionResultProps {
  output: SkillExecutionOutput;
  onClose: () => void;
  onOpenInChat?: (text: string) => void;
}

export const SkillExecutionResult: React.FC<SkillExecutionResultProps> = ({
  output,
  onClose,
  onOpenInChat,
}) => {
  const [copied, setCopied] = useState(false);
  const {
    approveAndExecute,
    rejectAction,
    cancelSession,
    isExecuting: isAgentExecuting,
    isDryRun,
    strongConfirmationAccepted,
    setStrongConfirmationAccepted,
  } = useAgent();

  const isSuccess = output.status === 'completed';
  const isFailed = output.status === 'failed';
  const isUnsupported = output.status === 'unsupported_context';

  const handleCopy = () => {
    if (output.textOutput && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(output.textOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      role="region"
      aria-label="Skill Execution Output"
      className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : isFailed ? (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {output.skillName}
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
              <span className="capitalize">{output.route.replace('_', ' ')}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {(output.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Dismiss result"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Rendered Instruction note */}
      <div className="mt-2 text-[11px] text-slate-500 italic truncate dark:text-slate-400">
        &ldquo;{output.renderedInstruction}&rdquo;
      </div>

      {/* Output Content */}
      <div className="mt-3">
        {isUnsupported ? (
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 dark:border-amber-900/40">
            <span className="font-semibold block mb-0.5">Unsupported Page Context</span>
            <p className="text-[11px] leading-relaxed">{output.error}</p>
          </div>
        ) : isFailed ? (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-900/40">
            <span className="font-semibold block mb-0.5">Execution Failed</span>
            <p className="text-[11px] leading-relaxed">{output.error}</p>
          </div>
        ) : output.agentAction ? (
          /* Browser action proposal requiring human approval */
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
              <Bot className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Proposed Single-Step Browser Action</span>
            </div>
            <AgentApprovalCard
              action={output.agentAction}
              isExecuting={isAgentExecuting}
              isDryRun={isDryRun}
              strongConfirmationAccepted={strongConfirmationAccepted}
              onStrongConfirmationChange={setStrongConfirmationAccepted}
              onApprove={approveAndExecute}
              onReject={rejectAction}
              onCancel={cancelSession}
            />
          </div>
        ) : (
          /* Standard text / summary output */
          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-800 dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-slate-200 whitespace-pre-wrap">
            {output.textOutput || 'Execution completed with no textual output.'}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {isSuccess && output.textOutput && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
          {onOpenInChat && (
            <button
              onClick={() => onOpenInChat(output.textOutput || '')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <ExternalLink className="h-3 w-3" />
              Continue in Chat
            </button>
          )}

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
