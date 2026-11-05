/**
 * Sahayak Agent History Component
 * Searchable, filterable audit log timeline of proposed, approved, rejected, previewed, and executed actions.
 */

import React, { useState } from 'react';
import { useAgentHistory } from '../hooks/useAgentHistory';
import { ActionLogFilter } from '../types/agent-log.types';
import AgentHistoryEntry from './AgentHistoryEntry';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import {
  History,
  Search,
  Trash2,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Eye,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface AgentHistoryProps {
  currentTabId?: number;
}

export const AgentHistory: React.FC<AgentHistoryProps> = ({ currentTabId }) => {
  const {
    filteredLogs,
    filter,
    searchQuery,
    isLoading,
    totalCount,
    setFilter,
    setSearchQuery,
    refreshLogs,
    clearLogs,
  } = useAgentHistory(currentTabId);

  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);

  const filterTabs: Array<{
    id: ActionLogFilter;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'all', label: 'All', icon: Filter },
    { id: 'success', label: 'Success', icon: CheckCircle2 },
    { id: 'dry_run', label: 'Dry-Run', icon: Eye },
    { id: 'failed', label: 'Failed', icon: AlertOctagon },
    { id: 'rejected', label: 'Rejected', icon: XCircle },
    { id: 'interrupted', label: 'Interrupted', icon: AlertTriangle },
  ];

  const handleClearConfirm = async () => {
    await clearLogs();
    setConfirmClearOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 text-left">
      {/* Search and Action Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search action logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8"
          />
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshLogs()}
          disabled={isLoading}
          className="h-8 px-2"
          title="Refresh logs"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmClearOpen(true)}
          disabled={totalCount === 0 || isLoading}
          className="h-8 px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400"
          title="Clear history"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Confirmation Dialog Banner */}
      {confirmClearOpen && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/90 p-2.5 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-200 flex flex-col gap-2">
          <p className="font-semibold leading-tight">
            Clear all {totalCount} action logs? This action cannot be undone. Active sessions will
            not be affected.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleClearConfirm}
              className="text-xs h-7 px-2.5"
            >
              Yes, Clear History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmClearOpen(false)}
              className="text-xs h-7 px-2.5"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all shrink-0',
                isActive
                  ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-500'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Log Entries List */}
      <div className="flex flex-col gap-2">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((entry) => <AgentHistoryEntry key={entry.id} entry={entry} />)
        ) : (
          <EmptyState
            icon={History}
            title={searchQuery ? 'No matching logs' : 'No action history yet'}
            description={
              searchQuery
                ? `No log entries matched "${searchQuery}". Try a different search term or filter.`
                : 'Actions proposed, approved, previewed in dry-run mode, and executed will appear here in chronological order.'
            }
          />
        )}
      </div>
    </div>
  );
};

export default AgentHistory;
