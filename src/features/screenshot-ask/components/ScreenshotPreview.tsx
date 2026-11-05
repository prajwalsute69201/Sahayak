/**
 * Screenshot Preview Component
 * Displays the captured screenshot preview, metadata tags, retake, and remove actions.
 */

import React, { useState } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { ProcessedScreenshot } from '../types/screenshot.types';
import {
  RotateCcw,
  Trash2,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  Globe,
  Sparkles,
} from 'lucide-react';

interface ScreenshotPreviewProps {
  screenshot: ProcessedScreenshot;
  onRetake: () => void;
  onRemove: () => void;
  isProcessing?: boolean;
}

export const ScreenshotPreview: React.FC<ScreenshotPreviewProps> = ({
  screenshot,
  onRetake,
  onRemove,
  isProcessing = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDomain = (url?: string) => {
    if (!url) return 'Webpage';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'Webpage';
    }
  };

  return (
    <Card className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Header bar with metadata & actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">
            {screenshot.pageTitle || getDomain(screenshot.pageUrl)}
          </span>
          <Badge variant="neutral" size="sm" className="text-[10px]">
            {screenshot.width} × {screenshot.height}
          </Badge>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Collapse preview' : 'Expand preview'}
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400"
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRetake}
            disabled={isProcessing}
            title="Retake screenshot"
            className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 dark:text-slate-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={isProcessing}
            title="Remove screenshot"
            className="h-7 w-7 p-0 text-slate-500 hover:text-red-600 dark:text-slate-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Image container */}
      <div
        className={`relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950/5 dark:bg-slate-950/40 transition-all duration-200 flex items-center justify-center ${
          isExpanded ? 'max-h-96' : 'max-h-40'
        }`}
      >
        <img
          src={screenshot.dataUrl}
          alt={screenshot.pageTitle || 'Captured screenshot'}
          className="w-full object-contain object-top rounded-lg"
          style={{ maxHeight: isExpanded ? '380px' : '160px' }}
        />

        {screenshot.isCompressed && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-xs">
            <Sparkles className="h-2.5 w-2.5 text-blue-400" />
            <span>Optimized ({formatSize(screenshot.processedSizeBytes)})</span>
          </div>
        )}
      </div>

      {/* Origin indicator footer */}
      {screenshot.pageUrl && (
        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 truncate">
          <Globe className="h-3 w-3 shrink-0" />
          <span className="truncate">{screenshot.pageUrl}</span>
        </div>
      )}
    </Card>
  );
};

export default ScreenshotPreview;
