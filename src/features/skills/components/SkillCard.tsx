/**
 * Sahayak SkillCard Component
 * Displays a single skill card with category badge, compatibility indicator,
 * parameter counts, favorite toggle, and execution/editing actions.
 */

import React, { useState } from 'react';
import {
  FileText,
  BookOpen,
  HelpCircle,
  ListChecks,
  Youtube,
  Target,
  PenTool,
  MessageSquare,
  Sparkles,
  Star,
  Play,
  Copy,
  Pencil,
  Trash2,
  Sliders,
  MoreVertical,
} from 'lucide-react';
import { Skill, SkillCategory, SkillPageContextInfo } from '../types/skill.types';
import { checkSkillCompatibility } from '../utils/skill-compatibility';
import { cn } from '@/utils/cn';

interface SkillCardProps {
  skill: Skill;
  pageContext: SkillPageContextInfo | null;
  onRun: (skill: Skill) => void;
  onEdit?: (skill: Skill) => void;
  onDuplicate: (skill: Skill) => void;
  onDelete?: (skillId: string) => void;
  onToggleFavorite: (skillId: string, isFavorite: boolean) => void;
  onToggleEnabled: (skillId: string, isEnabled: boolean) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  BookOpen,
  HelpCircle,
  ListChecks,
  Youtube,
  Target,
  PenTool,
  MessageSquare,
  Sparkles,
};

const CATEGORY_COLORS: Record<SkillCategory, { bg: string; text: string; border: string }> = {
  summarization: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/50',
  },
  research: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/50',
  },
  productivity: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/50',
  },
  writing: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/50',
  },
  page_interaction: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/50',
  },
  navigation: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800/50',
  },
  custom: {
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  },
};

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  pageContext,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onToggleEnabled,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const Icon = ICON_MAP[skill.icon] || Sparkles;
  const colors = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.custom;
  const compatibility = checkSkillCompatibility(skill, pageContext);
  const isBuiltIn = skill.source === 'built_in';
  const hasParams = skill.parameters.length > 0;

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border bg-white p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700',
        !skill.isEnabled && 'opacity-60 grayscale-50'
      )}
    >
      <div>
        {/* Header Badges & Actions */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border uppercase tracking-wider',
                colors.bg,
                colors.text,
                colors.border
              )}
            >
              {skill.category.replace('_', ' ')}
            </span>

            {isBuiltIn ? (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Built-in
              </span>
            ) : (
              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                Custom
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Favorite toggle */}
            <button
              onClick={() => onToggleFavorite(skill.id, !skill.isFavorite)}
              aria-label={skill.isFavorite ? 'Unfavorite skill' : 'Favorite skill'}
              className="rounded p-1 text-slate-400 hover:text-amber-500 transition-colors"
            >
              <Star
                className={cn('h-3.5 w-3.5', skill.isFavorite && 'fill-amber-400 text-amber-500')}
              />
            </button>

            {/* Overflow menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Skill actions menu"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate(skill);
                    }}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </button>

                  {!isBuiltIn && onEdit && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(skill);
                      }}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleEnabled(skill.id, !skill.isEnabled);
                    }}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Sliders className="h-3 w-3" />
                    {skill.isEnabled ? 'Disable' : 'Enable'}
                  </button>

                  {!isBuiltIn && onDelete && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowConfirmDelete(true);
                      }}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title and Icon */}
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {skill.name}
            </h4>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
              {skill.description}
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Bar */}
      {showConfirmDelete ? (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
          <span>Delete this skill?</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onDelete?.(skill.id)}
              className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-rose-700"
            >
              Yes
            </button>
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Footer Run & Compatibility info */
        <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            {/* Compatibility badge */}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                compatibility.statusBadge.variant === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : compatibility.statusBadge.variant === 'warning'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {compatibility.statusBadge.label}
            </span>

            {/* Parameter count */}
            <span className="text-[10px] text-slate-400">
              {hasParams
                ? `${skill.parameters.length} input${skill.parameters.length > 1 ? 's' : ''}`
                : '1-Click'}
            </span>
          </div>

          <button
            onClick={() => onRun(skill)}
            disabled={!skill.isEnabled || !compatibility.isCompatible}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              compatibility.isCompatible
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-slate-400 dark:bg-slate-700'
            )}
          >
            <Play className="h-3 w-3 fill-current" />
            {hasParams ? 'Run...' : 'Run'}
          </button>
        </div>
      )}
    </div>
  );
};
