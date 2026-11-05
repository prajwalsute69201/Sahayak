/**
 * Sahayak MemorySettingsView Component
 * Controls personalization toggles, suggestions, context size, and data export/import.
 */

import React, { useState } from 'react';
import { Download, Upload, Trash2, HardDrive, ToggleLeft, ToggleRight } from 'lucide-react';
import { MemorySettings, MemoryStorageStats } from '../types/memory.types';
import { cn } from '@/utils/cn';

interface MemorySettingsViewProps {
  settings: MemorySettings;
  stats: MemoryStorageStats;
  onUpdateSettings: (updates: Partial<MemorySettings>) => Promise<MemorySettings>;
  onClearAll: () => Promise<void>;
  onExport: () => Promise<string>;
  onImport: (jsonString: string) => Promise<{ importedCount: number; errors: string[] }>;
}

export const MemorySettingsView: React.FC<MemorySettingsViewProps> = ({
  settings,
  stats,
  onUpdateSettings,
  onClearAll,
  onExport,
  onImport,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleExport = async () => {
    const jsonStr = await onExport();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sahayak-memories-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await onImport(text);
      if (result.errors.length > 0) {
        setImportStatus(
          `Imported ${result.importedCount} items with ${result.errors.length} warnings.`
        );
      } else {
        setImportStatus(`Successfully imported ${result.importedCount} memories.`);
      }
      setTimeout(() => setImportStatus(null), 4000);
    } catch {
      setImportStatus('Failed to read or parse JSON file.');
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Memory Preferences & Storage
        </h4>
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          <HardDrive className="h-3.5 w-3.5" />
          {stats.count} / {stats.maxCount} items ({formatBytes(stats.estimatedSizeBytes)})
        </span>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              stats.percentageUsed > 80
                ? 'bg-rose-500'
                : stats.percentageUsed > 50
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
            )}
            style={{ width: `${Math.max(2, stats.percentageUsed)}%` }}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        {/* Personalization Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
              AI Personalization
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Inject task-relevant profile memories into Chat and Agent prompts
            </span>
          </div>
          <button
            onClick={() =>
              onUpdateSettings({ personalizationEnabled: !settings.personalizationEnabled })
            }
            aria-label="Toggle AI Personalization"
            className="text-slate-700 dark:text-slate-300"
          >
            {settings.personalizationEnabled ? (
              <ToggleRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-slate-400" />
            )}
          </button>
        </div>

        {/* Suggestions Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
              Memory Suggestions
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Proactively suggest saving recurring preferences or instructions
            </span>
          </div>
          <button
            onClick={() => onUpdateSettings({ suggestionsEnabled: !settings.suggestionsEnabled })}
            aria-label="Toggle Memory Suggestions"
            className="text-slate-700 dark:text-slate-300"
          >
            {settings.suggestionsEnabled ? (
              <ToggleRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-slate-400" />
            )}
          </button>
        </div>

        {/* Max Context Items */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
              Context Item Limit
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Max memories injected into a single prompt (saves token budget)
            </span>
          </div>
          <select
            value={settings.maxContextItems}
            onChange={(e) => onUpdateSettings({ maxContextItems: parseInt(e.target.value, 10) })}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value={3}>3 items</option>
            <option value={4}>4 items</option>
            <option value={5}>5 items</option>
            <option value={6}>6 items</option>
          </select>
        </div>
      </div>

      {importStatus && (
        <div className="rounded-lg bg-blue-50 p-2 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
          {importStatus}
        </div>
      )}

      {/* Export / Import & Clear Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Download className="h-3 w-3" />
            Export JSON
          </button>

          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
            <Upload className="h-3 w-3" />
            Import JSON
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>

        {showClearConfirm ? (
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-rose-600">Clear all?</span>
            <button
              onClick={async () => {
                await onClearAll();
                setShowClearConfirm(false);
              }}
              className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-rose-700"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-3 w-3" />
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};
