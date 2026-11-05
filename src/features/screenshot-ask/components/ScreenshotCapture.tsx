/**
 * Screenshot Capture Component
 * Initial / empty state prompting the user to capture their visible browser viewport.
 */

import React from 'react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingState from '@/components/common/LoadingState';
import ErrorState from '@/components/common/ErrorState';
import { Camera, Sparkles, Eye, ShieldAlert } from 'lucide-react';

interface ScreenshotCaptureProps {
  onCapture: () => void;
  isCapturing: boolean;
  error?: string | null;
}

export const ScreenshotCapture: React.FC<ScreenshotCaptureProps> = ({
  onCapture,
  isCapturing,
  error,
}) => {
  return (
    <Card className="flex flex-col items-center justify-center p-6 text-center border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-inner dark:bg-blue-950/80 dark:text-blue-400">
        <Camera className="h-7 w-7" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
          <Sparkles className="h-2.5 w-2.5" />
        </span>
      </div>

      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
        Screenshot-and-Ask (Vision)
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
        Capture your current browser tab viewport to ask questions about charts, diagrams, error
        messages, or extract visible text with Gemini Vision.
      </p>

      {isCapturing ? (
        <div className="mt-5 flex flex-col items-center">
          <LoadingState message="Capturing visible viewport..." />
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-2 w-full max-w-xs">
          <Button
            variant="primary"
            size="md"
            className="w-full justify-center shadow-sm font-semibold"
            onClick={onCapture}
          >
            <Camera className="h-4 w-4 mr-1.5" />
            Capture Screenshot
          </Button>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
            <Eye className="h-3 w-3" />
            Captures only what is currently visible on screen
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 w-full text-left">
          <ErrorState title="Capture Unavailable" message={error} onRetry={onCapture} />
        </div>
      )}

      {/* Security notice */}
      <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-100/80 p-2.5 text-left text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
        <ShieldAlert className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
        <span>
          <strong>Privacy note:</strong> Screenshots remain strictly in memory and are sent directly
          to the Gemini API. Images are never persisted or stored remotely. Internal browser pages
          (e.g. <code className="text-[10px]">chrome://</code>) cannot be captured.
        </span>
      </div>
    </Card>
  );
};

export default ScreenshotCapture;
