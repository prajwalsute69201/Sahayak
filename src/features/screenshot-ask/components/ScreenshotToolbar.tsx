/**
 * Screenshot Toolbar Component
 * Quick preset query chips and conversation controls for visual chat.
 */

import React from 'react';
import { VisualActionPreset } from '../types/screenshot.types';
import {
  FileSearch,
  BarChart2,
  AlertTriangle,
  FileText,
  Layers,
  Languages,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ScreenshotToolbarProps {
  onSelectPreset: (preset: VisualActionPreset) => void;
  onClearChat?: () => void;
  disabled?: boolean;
  hasMessages?: boolean;
}

interface PresetItem {
  id: VisualActionPreset;
  label: string;
  icon: React.ElementType;
}

const PRESETS: PresetItem[] = [
  { id: 'explain', label: 'Explain', icon: FileSearch },
  { id: 'chart', label: 'Chart Analysis', icon: BarChart2 },
  { id: 'error', label: 'Explain Error', icon: AlertTriangle },
  { id: 'ocr', label: 'Extract Text', icon: FileText },
  { id: 'elements', label: 'UI Elements', icon: Layers },
  { id: 'hinglish', label: 'In Hinglish', icon: Languages },
];

export const ScreenshotToolbar: React.FC<ScreenshotToolbarProps> = ({
  onSelectPreset,
  onClearChat,
  disabled = false,
  hasMessages = false,
}) => {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-blue-500" />
          Quick Visual Inquiries
        </span>

        {hasMessages && onClearChat && (
          <button
            type="button"
            onClick={onClearChat}
            disabled={disabled}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Clear chat
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPreset(preset.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
            >
              <Icon className="h-3 w-3 text-slate-400 group-hover:text-blue-500 dark:text-slate-500" />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ScreenshotToolbar;
