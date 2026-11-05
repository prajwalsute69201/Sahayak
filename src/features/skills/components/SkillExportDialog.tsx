/**
 * Sahayak SkillExportDialog Component
 * Modal to select and export skills into portable JSON packages.
 */

import React, { useState, useMemo } from 'react';
import { X, Download, Copy, Check, CheckSquare, Square } from 'lucide-react';
import { Skill } from '../types/skill.types';
import { skillExportService } from '../services/skill-export.service';

interface SkillExportDialogProps {
  skills: Skill[];
  isOpen: boolean;
  onClose: () => void;
}

export const SkillExportDialog: React.FC<SkillExportDialogProps> = ({
  skills,
  isOpen,
  onClose,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Default: select all custom skills
    const customOnly = skills.filter((s) => s.source === 'user_created').map((s) => s.id);
    return new Set(customOnly.length > 0 ? customOnly : skills.map((s) => s.id));
  });

  const [copied, setCopied] = useState(false);

  const selectedSkills = useMemo(() => {
    return skills.filter((s) => selectedIds.has(s.id));
  }, [skills, selectedIds]);

  const jsonPreview = useMemo(() => {
    if (selectedSkills.length === 0) return '';
    return skillExportService.exportToJsonString(selectedSkills);
  }, [selectedSkills]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectCustom = () => {
    const customIds = skills.filter((s) => s.source === 'user_created').map((s) => s.id);
    setSelectedIds(new Set(customIds));
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(skills.map((s) => s.id)));
  };

  const handleCopy = () => {
    if (jsonPreview && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(jsonPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (selectedSkills.length === 0) return;
    skillExportService.downloadExportFile(selectedSkills);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-export-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Download className="h-4 w-4" />
            </div>
            <h3
              id="skill-export-title"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Export Skills to JSON
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          {/* Quick Select Buttons */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Select Skills ({selectedSkills.length} of {skills.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectCustom}
                className="text-[11px] text-blue-600 hover:underline"
              >
                Custom Only
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-blue-600 hover:underline"
              >
                All Skills
              </button>
            </div>
          </div>

          {/* Skills checklist */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {skills.map((skill) => {
              const isChecked = selectedIds.has(skill.id);
              return (
                <div
                  key={skill.id}
                  onClick={() => handleToggle(skill.id)}
                  className={`flex items-center justify-between rounded-lg border p-2 text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isChecked ? (
                      <CheckSquare className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {skill.name}
                    </span>
                  </div>
                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {skill.source === 'built_in' ? 'Built-in' : 'Custom'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* JSON Preview */}
          {jsonPreview && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  JSON Package Preview
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy JSON
                    </>
                  )}
                </button>
              </div>

              <textarea
                readOnly
                rows={5}
                value={jsonPreview}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 resize-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedSkills.length === 0}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download JSON File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
