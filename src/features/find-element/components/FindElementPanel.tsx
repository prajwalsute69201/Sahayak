/**
 * Sahayak "Find It For Me" Main Panel Component
 * Unified interface integrating natural-language input, candidate rankings,
 * multi-match navigation, and Shadow DOM visual element location.
 */

import React from 'react';
import FindElementInput from './FindElementInput';
import MatchNavigation from './MatchNavigation';
import ElementMatchList from './ElementMatchList';
import ClarificationPrompt from './ClarificationPrompt';
import EmptyState from '@/components/common/EmptyState';
import FeedbackBanner from '@/components/common/FeedbackBanner';
import Button from '@/components/common/Button';
import { useFindElement } from '../hooks/useFindElement';
import { ScannedElement } from '@/features/element-scanner';
import { Search, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

interface FindElementPanelProps {
  candidates: ScannedElement[];
  onTriggerScan?: () => void;
}

export const FindElementPanel: React.FC<FindElementPanelProps> = ({
  candidates,
  onTriggerScan,
}) => {
  const {
    query,
    isSearching,
    result,
    activeMatchIndex,
    highlightedActionId,
    error,
    isStale,
    setQuery,
    search,
    selectMatchIndex,
    nextMatch,
    prevMatch,
    clearSearch,
    rescanAndRetry,
    clearError,
  } = useFindElement(candidates);

  return (
    <div className="flex flex-col gap-3">
      {/* Search Input Box & Suggestions */}
      <FindElementInput
        query={query}
        isSearching={isSearching}
        onQueryChange={setQuery}
        onSearch={search}
        onClear={clearSearch}
      />

      {/* Error Feedback */}
      {error && <FeedbackBanner status="error" message={error} onDismiss={clearError} />}

      {/* Stale DOM Element Alert */}
      {isStale && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>The target element seems to have moved or updated.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={rescanAndRetry}
            className="h-6 px-2 text-[11px]"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Rescan
          </Button>
        </div>
      )}

      {/* Clarification prompt */}
      {result?.clarificationNeeded && result.clarificationQuestion && (
        <ClarificationPrompt
          question={result.clarificationQuestion}
          candidateMatches={result.matches}
          onSelectCandidate={async (actionId) => {
            const idx = result.matches.findIndex((m) => m.actionId === actionId);
            if (idx !== -1) {
              await selectMatchIndex(idx);
            }
          }}
        />
      )}

      {/* Multi-match Navigator */}
      {result && result.matches.length > 1 && (
        <MatchNavigation
          currentIndex={activeMatchIndex}
          totalMatches={result.matches.length}
          onPrev={prevMatch}
          onNext={nextMatch}
          onLocate={() => selectMatchIndex(activeMatchIndex)}
        />
      )}

      {/* Matches List */}
      {result && result.matches.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium px-0.5">
            <span>
              Found {result.matches.length} {result.matches.length === 1 ? 'match' : 'matches'} in{' '}
              {result.durationMs}ms
            </span>
            <span className="capitalize">{result.matchSource} Match</span>
          </div>

          <ElementMatchList
            matches={result.matches}
            highlightedActionId={highlightedActionId}
            onHighlight={(actionId) => {
              const idx = result.matches.findIndex((m) => m.actionId === actionId);
              if (idx !== -1) {
                selectMatchIndex(idx);
              }
            }}
          />
        </div>
      )}

      {/* Not Found Empty State */}
      {result && result.notFound && !isSearching && (
        <EmptyState
          icon={Search}
          title="No Matching Element Found"
          description={`We couldn't find an interactive element matching "${result.query}". Try rephrasing or click below to rescan the webpage.`}
          className="py-6"
        >
          {onTriggerScan && (
            <Button variant="outline" size="sm" onClick={onTriggerScan} className="mt-2 text-xs">
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Rescan Webpage
            </Button>
          )}
        </EmptyState>
      )}

      {/* Initial Prompt State when no query has been run yet */}
      {!result && !isSearching && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-left dark:border-slate-800 dark:bg-slate-900/30">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>How &ldquo;Find It For Me&rdquo; Works:</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Describe any control in natural English or Hinglish (e.g., &ldquo;Find the sign in
            button&rdquo; or &ldquo;Search bar kahan hai&rdquo;). Sahayak cross-references the
            scanned DOM and visually highlights the exact control on your screen.
          </p>
        </div>
      )}
    </div>
  );
};

export default FindElementPanel;
