/**
 * Sahayak Blocked Action Notice Component (Slice 16)
 * Prominently explains why an action was blocked deterministically by safety policy.
 * Clarifies that no approval buttons exist to authorize blocked actions.
 */

import React from 'react';
import { ShieldX, Lock, AlertOctagon } from 'lucide-react';
import { SafetyPolicyDecision } from '../types/safety.types';

interface BlockedActionNoticeProps {
  decision: SafetyPolicyDecision;
}

export const BlockedActionNotice: React.FC<BlockedActionNoticeProps> = ({ decision }) => {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-red-300 bg-red-50/90 p-3.5 text-left text-red-950 shadow-xs dark:border-red-800 dark:bg-red-950/70 dark:text-red-100">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
          <ShieldX className="h-4 w-4" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            Deterministic Security Gate
          </span>
          <h4 className="text-xs font-bold leading-tight">Action Blocked by Safety Policy</h4>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-red-900 dark:text-red-200">{decision.reason}</p>

      {/* Policy details */}
      <div className="flex flex-col gap-1 rounded-lg border border-red-200/80 bg-white/70 p-2 text-[11px] text-red-900 dark:border-red-900/50 dark:bg-slate-900/70 dark:text-red-300">
        <div className="flex items-center gap-1.5 font-semibold">
          <Lock className="h-3 w-3 text-red-600 dark:text-red-400" />
          <span>Category:</span>
          <span className="font-mono text-[10px] uppercase font-bold text-red-700 dark:text-red-300">
            {decision.blockedCategory || 'consequential_action'}
          </span>
        </div>
        {decision.applicableRules.length > 0 && (
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Rule Enforced: <code className="font-mono">{decision.applicableRules.join(', ')}</code>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-800 dark:text-red-300">
        <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-red-600" />
        <span>
          This operation cannot be authorized or executed. Sahayak strictly guards against automated
          consequential mutations.
        </span>
      </div>
    </div>
  );
};

export default BlockedActionNotice;
