/**
 * Sahayak Agent Approval Card Component (HITL)
 * Displays the proposed single step with transparent explanations,
 * risk classification, target element preview, dry-run mode notice, and explicit approval controls.
 */

import React, { useMemo } from 'react';
import { AgentAction } from '../types/agent.types';
import Button from '@/components/common/Button';
import {
  MousePointerClick,
  ArrowUpDown,
  ExternalLink,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { safetyPolicyService } from '@/features/safety/services/safety-policy.service';
import { RiskIndicator } from '@/features/safety/components/RiskIndicator';
import { BlockedActionNotice } from '@/features/safety/components/BlockedActionNotice';
import { EnhancedConfirmation } from '@/features/safety/components/EnhancedConfirmation';

interface AgentApprovalCardProps {
  action: AgentAction;
  isExecuting: boolean;
  isDryRun?: boolean;
  strongConfirmationAccepted: boolean;
  onStrongConfirmationChange: (accepted: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}

export const AgentApprovalCard: React.FC<AgentApprovalCardProps> = ({
  action,
  isExecuting,
  isDryRun = false,
  strongConfirmationAccepted,
  onStrongConfirmationChange,
  onApprove,
  onReject,
  onCancel,
}) => {
  // Deterministic Safety Policy Evaluation (Independent of AI-supplied risk)
  const policyDecision = useMemo(() => {
    return safetyPolicyService.evaluateAction(action);
  }, [action]);

  // Action icon
  const ActionIcon = {
    click_element: MousePointerClick,
    scroll_to_element: Eye,
    scroll_page: ArrowUpDown,
    navigate_to_url: ExternalLink,
    highlight_element: Eye,
  }[action.type];

  const effectiveDryRun = isDryRun || action.isDryRun;
  const isBlocked = policyDecision.isBlocked || policyDecision.decision === 'blocked';
  const requiresEnhanced = policyDecision.requiredConfirmation === 'enhanced_confirmation';

  const isApproveDisabled =
    isExecuting ||
    isBlocked ||
    (!effectiveDryRun && requiresEnhanced && !strongConfirmationAccepted);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-white p-3.5 text-left shadow-xs dark:border-blue-900/60 dark:bg-slate-900">
      {/* Blocked Action Notice (Takes Precedence) */}
      {isBlocked && <BlockedActionNotice decision={policyDecision} />}

      {/* Dry-Run Preview Banner */}
      {effectiveDryRun && !isBlocked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <Eye className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-col text-[11px] leading-tight">
            <span className="font-bold">Dry-Run Preview Active</span>
            <span className="text-amber-700 dark:text-amber-300">
              This action will be simulated safely. Zero browser clicks, typing, or navigation will
              occur.
            </span>
          </div>
        </div>
      )}

      {/* Header: Title + Risk Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <ActionIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Proposed Action (Single Step)
            </span>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">{action.title}</h3>
          </div>
        </div>

        {/* Deterministic Risk Indicator */}
        <RiskIndicator risk={policyDecision.risk} />
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {action.description}
      </p>

      {/* Target Details Box */}
      <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-xs dark:border-slate-800 dark:bg-slate-950/60 flex flex-col gap-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          Target Details
        </span>

        {'targetActionId' in action && (
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-slate-900 px-1 py-0.2 font-mono text-[9px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
              #{action.targetActionId}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {action.targetElementLabel || 'Target Element'}
            </span>
            {'targetTagName' in action && action.targetTagName && (
              <span className="font-mono text-[11px] text-slate-400">
                &lt;{action.targetTagName}&gt;
              </span>
            )}
          </div>
        )}

        {'targetUrl' in action && (
          <div className="flex items-center gap-1 truncate text-blue-600 dark:text-blue-400 font-mono text-[11px]">
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{action.targetUrl}</span>
          </div>
        )}

        {'direction' in action && (
          <div className="text-xs font-semibold">
            Direction: <span className="capitalize">{action.direction}</span> (
            {action.amountPx || '500'}px)
          </div>
        )}
      </div>

      {/* Rationale & Expected Outcome */}
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
        <div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Why this step: </span>
          <span>{action.reason}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Expected outcome:{' '}
          </span>
          <span>{action.expectedResult}</span>
        </div>
      </div>

      {/* Enhanced Confirmation UI (Slice 16) */}
      {!effectiveDryRun && !isBlocked && requiresEnhanced && (
        <EnhancedConfirmation
          accepted={strongConfirmationAccepted}
          onAcceptedChange={onStrongConfirmationChange}
          reason={policyDecision.reason}
        />
      )}

      {/* HITL Controls */}
      <div className="flex items-center gap-2 pt-1">
        {/* Approve button is strictly hidden/disabled if the action is blocked */}
        {!isBlocked && (
          <Button
            variant={effectiveDryRun ? 'secondary' : 'primary'}
            size="sm"
            onClick={onApprove}
            disabled={isApproveDisabled}
            isLoading={isExecuting}
            className="flex-1 text-xs font-bold"
          >
            {effectiveDryRun ? (
              <>
                <Eye className="h-3.5 w-3.5 mr-1 text-amber-600" />
                Preview Only (Dry-Run)
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Approve &amp; Execute
              </>
            )}
          </Button>
        )}

        <Button
          variant={isBlocked ? 'secondary' : 'outline'}
          size="sm"
          onClick={onReject}
          disabled={isExecuting}
          className="text-xs"
          title={isBlocked ? 'Dismiss blocked proposal' : 'Reject this proposal'}
        >
          <XCircle className="h-3.5 w-3.5 mr-1" />
          {isBlocked ? 'Dismiss' : 'Reject'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isExecuting}
          className="text-xs text-slate-400 hover:text-slate-600"
          title="Cancel task"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default AgentApprovalCard;
