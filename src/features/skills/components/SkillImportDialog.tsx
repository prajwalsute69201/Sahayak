/**
 * Sahayak SkillImportDialog Component
 * Secure modal to preview, select, and import skills from portable JSON packages.
 */

import React, { useState } from 'react';
import { X, Upload, AlertTriangle, CheckCircle2, Check } from 'lucide-react';
import {
  skillImportService,
  ImportPreviewResult,
  ImportExecutionResult,
} from '../services/skill-import.service';

interface SkillImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => Promise<void>;
}

export const SkillImportDialog: React.FC<SkillImportDialogProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [collisionStrategy, setCollisionStrategy] = useState<'rename' | 'overwrite'>('rename');
  const [importReport, setImportReport] = useState<ImportExecutionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setJsonInput(text);
      await runPreview(text);
    } catch {
      setError('Failed to read file.');
    }
  };

  const runPreview = async (text: string) => {
    setError(null);
    setImportReport(null);
    try {
      const res = await skillImportService.previewImport(text);
      setPreview(res);
      if (res.items.length > 0) {
        setSelectedSkillIds(new Set(res.items.map((i) => i.skill.id)));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON');
    }
  };

  const handleToggleSelect = (skillId: string) => {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const handleExecuteImport = async () => {
    if (!preview) return;

    const itemsToImport = preview.items
      .filter((i) => selectedSkillIds.has(i.skill.id))
      .map((i) => i.skill);

    if (itemsToImport.length === 0) {
      setError('Please select at least one skill to import.');
      return;
    }

    try {
      setIsProcessing(true);
      const report = await skillImportService.executeImport(itemsToImport, {
        resolveCollisions: collisionStrategy,
      });
      setImportReport(report);
      await onImportComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-import-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Upload className="h-4 w-4" />
            </div>
            <h3
              id="skill-import-title"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Import Skills JSON
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
            {error}
          </div>
        )}

        {importReport ? (
          /* Success / Report View */
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <h4 className="mt-2 text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Import Complete
              </h4>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                Successfully imported {importReport.importedCount} skills
                {importReport.skippedCount > 0 ? ` (${importReport.skippedCount} skipped)` : ''}.
              </p>
            </div>

            {importReport.errors.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                <span className="font-semibold block mb-1">Warnings:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {importReport.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                onClick={onClose}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Import Form & Preview View */
          <div className="mt-4 space-y-4">
            {/* File Upload & Paste input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Select File or Paste JSON
                </label>
                <label className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  Browse File...
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={4}
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  if (e.target.value.trim().length > 10) {
                    runPreview(e.target.value);
                  }
                }}
                placeholder="Paste sahayak-skills JSON here or click 'Browse File'..."
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 resize-none"
              />
            </div>

            {/* Preview Section */}
            {preview && preview.items.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Found {preview.items.length} Skills in Package
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSkillIds(new Set(preview.items.map((i) => i.skill.id)))
                      }
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSkillIds(new Set())}
                      className="text-[10px] text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {preview.items.map((item) => {
                    const isSelected = selectedSkillIds.has(item.skill.id);

                    return (
                      <div
                        key={item.skill.id}
                        className={`flex items-start gap-2.5 rounded-lg border p-2 text-xs transition-colors ${
                          isSelected
                            ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.skill.id)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.skill.name}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400 capitalize">
                              {item.skill.category.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.skill.description}
                          </p>

                          {/* Warning badges */}
                          {item.isBuiltinId && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                              Built-in ID collision (will be imported as a custom copy)
                            </span>
                          )}
                          {!item.isBuiltinId && item.hasIdCollision && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
                              Existing skill with same ID detected
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Collision Strategy */}
                <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-100 pt-2.5 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Duplicate IDs:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                      <input
                        type="radio"
                        name="collisionStrategy"
                        value="rename"
                        checked={collisionStrategy === 'rename'}
                        onChange={() => setCollisionStrategy('rename')}
                      />
                      Assign New ID (Keep both)
                    </label>
                    <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                      <input
                        type="radio"
                        name="collisionStrategy"
                        value="overwrite"
                        checked={collisionStrategy === 'overwrite'}
                        onChange={() => setCollisionStrategy('overwrite')}
                      />
                      Overwrite Custom
                    </label>
                  </div>
                </div>
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
                disabled={!preview || selectedSkillIds.size === 0 || isProcessing}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {isProcessing ? 'Importing...' : `Import ${selectedSkillIds.size} Skills`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
