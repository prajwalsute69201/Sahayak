/**
 * Sahayak MemoryCard Component
 * Displays a single stored profile memory with tags, category badge, and actions.
 */

import React, { useState } from 'react';
import {
  Brain,
  Briefcase,
  Languages,
  Sliders,
  User,
  Bookmark,
  Pencil,
  Trash2,
  Calendar,
  Sparkles,
  MessageSquare,
  FileEdit,
} from 'lucide-react';
import { MemoryCategory, MemoryRecord, MemorySource } from '../types/memory.types';
import { MemoryRetrievalService } from '../services/memory-retrieval.service';
import { cn } from '@/utils/cn';

interface MemoryCardProps {
  memory: MemoryRecord;
  onEdit: (memory: MemoryRecord) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_ICONS: Record<MemoryCategory, React.ElementType> = {
  preferences: Sliders,
  personal_profile: User,
  work_context: Briefcase,
  language_preferences: Languages,
  interaction_preferences: Brain,
  custom: Bookmark,
};

const CATEGORY_COLORS: Record<MemoryCategory, { bg: string; text: string; border: string }> = {
  preferences: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/50',
  },
  personal_profile: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/50',
  },
  work_context: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/50',
  },
  language_preferences: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/50',
  },
  interaction_preferences: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/50',
  },
  custom: {
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  },
};

const SOURCE_LABELS: Record<MemorySource, { label: string; icon: React.ElementType }> = {
  explicit_instruction: { label: 'From Chat', icon: MessageSquare },
  manual_entry: { label: 'Manual Entry', icon: FileEdit },
  suggestion_accepted: { label: 'Accepted Suggestion', icon: Sparkles },
};

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onEdit, onDelete }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const Icon = CATEGORY_ICONS[memory.category] || Bookmark;
  const colors = CATEGORY_COLORS[memory.category] || CATEGORY_COLORS.custom;
  const categoryLabel = MemoryRetrievalService.CATEGORY_LABELS[memory.category] || memory.category;
  const sourceInfo = SOURCE_LABELS[memory.source] || SOURCE_LABELS.manual_entry;
  const SourceIcon = sourceInfo.icon;

  const formattedDate = new Date(memory.updatedAt || memory.createdAt).toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div>
        {/* Category & Source Badges */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium border',
              colors.bg,
              colors.text,
              colors.border
            )}
          >
            <Icon className="h-3 w-3" />
            {categoryLabel}
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <SourceIcon className="h-3 w-3" />
            {sourceInfo.label}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{memory.title}</h4>

        {/* Content */}
        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
          {memory.content}
        </p>

        {/* Tags */}
        {memory.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer info & action controls */}
      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
        <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
          <Calendar className="h-2.5 w-2.5" />
          {formattedDate}
        </span>

        {showConfirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              Delete?
            </span>
            <button
              onClick={() => onDelete(memory.id)}
              className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-rose-700 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(memory)}
              aria-label={`Edit ${memory.title}`}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              aria-label={`Delete ${memory.title}`}
              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
