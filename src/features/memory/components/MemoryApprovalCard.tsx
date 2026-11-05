/**
 * Sahayak MemoryApprovalCard Component
 * Human-in-the-Loop approval card displayed when explicit or suggested memory actions are detected.
 * Strictly requires user confirmation before saving, updating, or deleting any memory.
 */

import React from 'react';
import {
  Check,
  X,
  Pencil,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  BookmarkPlus,
  Trash2,
} from 'lucide-react';
import { MemoryProposal } from '../types/memory.types';
import { MemoryRetrievalService } from '../services/memory-retrieval.service';
import { cn } from '@/utils/cn';

interface MemoryApprovalCardProps {
  proposal: MemoryProposal;
  onApprove: (proposal: MemoryProposal) => Promise<void>;
  onReject: (proposal: MemoryProposal) => void;
  onEdit?: (proposal: MemoryProposal) => void;
  className?: string;
}

export const MemoryApprovalCard: React.FC<MemoryApprovalCardProps> = ({
  proposal,
  onApprove,
  onReject,
  onEdit,
  className,
}) => {
  const isDelete = proposal.action === 'delete';
  const isUpdate = proposal.action === 'update';
  const isSuggestion = proposal.source === 'suggestion_accepted';

  const categoryLabel =
    MemoryRetrievalService.CATEGORY_LABELS[proposal.category] || proposal.category;

  return (
    <div
      role="region"
      aria-label="Memory Confirmation Card"
      className={cn(
        'relative my-2.5 overflow-hidden rounded-xl border p-3.5 shadow-sm transition-all',
        isDelete
          ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30'
          : isUpdate
            ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30'
            : isSuggestion
              ? 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/50 dark:bg-indigo-950/30'
              : 'border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/30',
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isDelete ? (
            <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          ) : isSuggestion ? (
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          ) : isUpdate ? (
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <BookmarkPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}

          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              isDelete
                ? 'text-rose-800 dark:text-rose-300'
                : isUpdate
                  ? 'text-amber-800 dark:text-amber-300'
                  : isSuggestion
                    ? 'text-indigo-800 dark:text-indigo-300'
                    : 'text-blue-800 dark:text-blue-300'
            )}
          >
            {isDelete
              ? 'Forget Memory Proposal'
              : isUpdate
                ? 'Update Existing Memory'
                : isSuggestion
                  ? 'Memory Suggestion'
                  : 'Save to Memory'}
          </span>
        </div>

        <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-xs dark:bg-slate-800/90 dark:text-slate-300">
          {categoryLabel}
        </span>
      </div>

      {/* Trigger text excerpt */}
      <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 italic truncate">
        &ldquo;{proposal.triggerText}&rdquo;
      </div>

      {/* Proposal Details */}
      <div className="mt-2.5 rounded-lg border border-slate-200/80 bg-white/95 p-2.5 dark:border-slate-800 dark:bg-slate-900/95">
        <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          {proposal.title}
        </h5>

        {/* If update, show Old vs New diff */}
        {isUpdate && proposal.existingMemory ? (
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="rounded bg-rose-50/80 p-1.5 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40">
              <span className="font-medium text-[10px] uppercase tracking-wider block text-rose-600 dark:text-rose-400">
                Current
              </span>
              <p className="mt-0.5 text-[11px]">{proposal.existingMemory.content}</p>
            </div>
            <div className="flex justify-center text-slate-400">
              <ArrowRight className="h-3 w-3 rotate-90" />
            </div>
            <div className="rounded bg-emerald-50/80 p-1.5 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
              <span className="font-medium text-[10px] uppercase tracking-wider block text-emerald-600 dark:text-emerald-400">
                New
              </span>
              <p className="mt-0.5 text-[11px]">{proposal.content}</p>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {proposal.content}
          </p>
        )}

        {/* Tags */}
        {proposal.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {proposal.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* HITL Action Controls */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {onEdit && !isDelete && (
            <button
              onClick={() => onEdit(proposal)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
          <button
            onClick={() => onReject(proposal)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-3 w-3" />
            Discard
          </button>
        </div>

        <button
          onClick={() => onApprove(proposal)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-white shadow-xs transition-colors',
            isDelete
              ? 'bg-rose-600 hover:bg-rose-700'
              : isUpdate
                ? 'bg-amber-600 hover:bg-amber-700'
                : isSuggestion
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          {isDelete ? (
            <>
              <Trash2 className="h-3.5 w-3.5" />
              Forget This
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              {isUpdate ? 'Update Memory' : 'Save to Memory'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
