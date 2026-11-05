/**
 * Sahayak Enhanced Confirmation Component (Slice 16)
 * Explicit double-acknowledgement checkbox for supported elevated-risk actions.
 * Guarantees that opening or viewing the card is not treated as approval.
 */

import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface EnhancedConfirmationProps {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  reason?: string;
  disabled?: boolean;
}

export const EnhancedConfirmation: React.FC<EnhancedConfirmationProps> = ({
  accepted,
  onAcceptedChange,
  reason,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-left text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="font-bold">Enhanced Confirmation Required</span>
          <span className="text-[11px] leading-snug text-amber-800 dark:text-amber-300">
            {reason ||
              'This action carries elevated risk or targets an element with ambiguous metadata. Explicit user acknowledgement is mandatory before proceeding.'}
          </span>
        </div>
      </div>

      <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 mt-0.5"
        />
        <div className="flex flex-col text-[11px]">
          <span className="font-bold text-amber-950 dark:text-amber-100">
            I understand the consequences and authorize this step
          </span>
          <span className="text-[10px] text-amber-700 dark:text-amber-400">
            Approval applies strictly to this single step. Fresh approval is required if the page
            changes.
          </span>
        </div>
      </label>
    </div>
  );
};

export default EnhancedConfirmation;
