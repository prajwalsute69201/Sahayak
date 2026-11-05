/**
 * Sahayak Clarification Prompt Component
 * Renders clarifying questions when user requests match multiple ambiguous elements.
 */

import React from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { ElementMatch } from '../types/find-element.types';

interface ClarificationPromptProps {
  question: string;
  candidateMatches: ElementMatch[];
  onSelectCandidate: (actionId: number) => void;
}

export const ClarificationPrompt: React.FC<ClarificationPromptProps> = ({
  question,
  candidateMatches,
  onSelectCandidate,
}) => {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-left dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex flex-col">
          <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
            Clarification Needed
          </span>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-snug">
            {question}
          </p>
        </div>
      </div>

      {candidateMatches.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide dark:text-amber-300">
            Choose Intended Target:
          </span>
          {candidateMatches.slice(0, 3).map((match) => (
            <button
              key={match.actionId}
              type="button"
              onClick={() => onSelectCandidate(match.actionId)}
              className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-800 transition-colors hover:border-blue-400 hover:bg-blue-50/60 dark:border-amber-800/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/60"
            >
              <div className="flex items-center gap-1.5 truncate pr-2">
                <span className="font-mono text-[10px] font-bold text-slate-500">
                  #{match.actionId}
                </span>
                <span className="font-semibold truncate">{match.element.label}</span>
              </div>
              <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClarificationPrompt;
