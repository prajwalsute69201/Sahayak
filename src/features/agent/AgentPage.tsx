/**
 * Sahayak Agent Page - Phase 3 ("The Hands")
 * Houses Single-Step Agent Loop & HITL Approval UI (Slice 12),
 * Progress Persistence, Dry-Run Mode & Action Logs (Slice 13),
 * "Find It For Me" (Slice 11), and the Interactive Element Scanner (Slice 10).
 */

import React, { useState } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import FeedbackBanner from '@/components/common/FeedbackBanner';
import EmptyState from '@/components/common/EmptyState';
import {
  ScannerControls,
  ScanSummaryView,
  ElementList,
  useElementScanner,
} from '@/features/element-scanner';
import { FindElementPanel } from '@/features/find-element';
import { AgentLoopPanel } from './components/AgentLoopPanel';
import { AgentHistory } from './components/AgentHistory';
import { Bot, Layers, ShieldCheck, Sparkles, UserCheck, History } from 'lucide-react';
import { cn } from '@/utils/cn';

export const AgentPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'loop' | 'find' | 'scanner' | 'history'>('loop');

  const {
    elements,
    filteredElements,
    summary,
    isScanning,
    badgesVisible,
    selectedActionId,
    error,
    filterCategory,
    searchQuery,
    hasScanned,
    scanPage,
    rescanPage,
    toggleBadges,
    highlightElement,
    stopScanner,
    setFilterCategory,
    setSearchQuery,
    clearError,
  } = useElementScanner();

  return (
    <div className="flex flex-col gap-3.5 text-left pb-4">
      {/* Header Banner */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-transparent border-blue-200/60 dark:border-blue-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Interactive Agent &amp; Action Loop
            </h2>
            <Badge variant="primary" size="sm">
              Slice 13
            </Badge>
          </div>
          <Badge variant="success" size="sm">
            Phase 3
          </Badge>
        </div>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Single-step AI agent loop with Human-In-The-Loop approvals, Dry-Run Mode, progress
          persistence, and complete action history.
        </p>
      </Card>

      {/* Segmented Sub-Tab Switcher */}
      <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('loop')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition-all',
            activeSubTab === 'loop'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <UserCheck className="h-3.5 w-3.5 shrink-0" />
          <span>Agent Loop</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('find')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition-all',
            activeSubTab === 'find'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>Find It</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('scanner')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition-all',
            activeSubTab === 'scanner'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span>Map</span>
          {hasScanned && (
            <span className="ml-0.5 rounded-full bg-slate-200 px-1 py-0.2 text-[9px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {elements.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition-all',
            activeSubTab === 'history'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <History className="h-3.5 w-3.5 shrink-0" />
          <span>History</span>
        </button>
      </div>

      {/* Error feedback banner */}
      {error && <FeedbackBanner status="error" message={error} onDismiss={clearError} />}

      {/* Sub-Tab 1: Single-Step Agent Loop (HITL) */}
      {activeSubTab === 'loop' && <AgentLoopPanel candidates={elements} />}

      {/* Sub-Tab 2: Find It For Me */}
      {activeSubTab === 'find' && (
        <FindElementPanel candidates={elements} onTriggerScan={scanPage} />
      )}

      {/* Sub-Tab 3: Action History Audit Trail */}
      {activeSubTab === 'history' && <AgentHistory />}

      {/* Sub-Tab 4: Action Map & Scanner Controls */}
      {activeSubTab === 'scanner' && (
        <div className="flex flex-col gap-3">
          {/* Scanner Controls Card */}
          <ScannerControls
            isScanning={isScanning}
            hasScanned={hasScanned}
            badgesVisible={badgesVisible}
            elementCount={elements.length}
            onScan={scanPage}
            onRescan={rescanPage}
            onToggleBadges={() => toggleBadges()}
            onStop={stopScanner}
          />

          {/* State A: Before first scan */}
          {!hasScanned && !isScanning && !error && (
            <EmptyState
              icon={Layers}
              title="Scan Active Webpage"
              description="Click 'Scan Active Page' above to detect buttons, form fields, navigation links, and media controls. Lightweight numbered badges will appear directly on the page via an isolated Shadow DOM overlay."
            >
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-left dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Safe &amp; Non-Intrusive Principles:</span>
                </div>
                <ul className="mt-1.5 space-y-1 text-[11px] text-slate-500 dark:text-slate-400 list-disc list-inside">
                  <li>Pass-through clicks (badges never block user interaction)</li>
                  <li>Encapsulated Shadow DOM (no style bleed or page layout shift)</li>
                  <li>Zero data exfiltration (passwords and sensitive values are never read)</li>
                  <li>No automatic clicks without explicit human approval</li>
                </ul>
              </div>
            </EmptyState>
          )}

          {/* State B: After scanning */}
          {hasScanned && summary && (
            <>
              {/* Summary Breakdown & Filter Pills */}
              <ScanSummaryView
                summary={summary}
                activeFilter={filterCategory}
                onSelectFilter={setFilterCategory}
              />

              {/* Search and Element List */}
              <ElementList
                elements={filteredElements}
                totalElementsCount={elements.length}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedActionId={selectedActionId}
                onHighlightElement={highlightElement}
              />
            </>
          )}
        </div>
      )}

      {/* Future Roadmap Card */}
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-left dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          <Bot className="h-3.5 w-3.5 text-blue-500" />
          <span>Next in Phase 4:</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Slice 14 (Local Profile Memory) will introduce on-device personal profile storage for
          automated, user-approved form-filling.
        </p>
      </div>
    </div>
  );
};

export default AgentPage;
