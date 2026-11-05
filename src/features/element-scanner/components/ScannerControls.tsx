/**
 * Sahayak Scanner Controls Component
 * Provides explicit user triggers to scan, rescan, and toggle Shadow DOM badges.
 */

import React from 'react';
import Button from '@/components/common/Button';
import Toggle from '@/components/common/Toggle';
import Badge from '@/components/common/Badge';
import { ScanSearch, RefreshCw, XCircle, Eye, EyeOff } from 'lucide-react';

interface ScannerControlsProps {
  isScanning: boolean;
  hasScanned: boolean;
  badgesVisible: boolean;
  elementCount: number;
  onScan: () => void;
  onRescan: () => void;
  onToggleBadges: () => void;
  onStop: () => void;
}

export const ScannerControls: React.FC<ScannerControlsProps> = ({
  isScanning,
  hasScanned,
  badgesVisible,
  elementCount,
  onScan,
  onRescan,
  onToggleBadges,
  onStop,
}) => {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400">
            <ScanSearch className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Interactive Element Scanner
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Scans buttons, inputs, links, and forms
            </p>
          </div>
        </div>

        {hasScanned && (
          <Badge variant="primary" size="sm" className="font-semibold">
            {elementCount} Elements
          </Badge>
        )}
      </div>

      {/* Main Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {!hasScanned ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onScan}
            isLoading={isScanning}
            className="flex-1 text-xs font-semibold"
          >
            <ScanSearch className="mr-1.5 h-3.5 w-3.5" />
            Scan Active Page
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={onRescan}
              isLoading={isScanning}
              className="flex-1 text-xs font-semibold"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Rescan Page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="text-xs text-slate-600 dark:text-slate-300"
              title="Clear badges and stop scanner"
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Show/Hide Badges Toggle */}
      {hasScanned && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            {badgesVisible ? (
              <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            )}
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Page Overlay Badges
            </span>
          </div>
          <Toggle checked={badgesVisible} onChange={onToggleBadges} label="" className="py-0" />
        </div>
      )}
    </div>
  );
};

export default ScannerControls;
