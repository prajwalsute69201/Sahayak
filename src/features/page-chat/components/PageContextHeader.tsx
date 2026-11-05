import React from 'react';
import { PageContext } from '../types/chat.types';
import Badge from '@/components/common/Badge';
import { RefreshCw, FileText, Youtube, Globe, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PageContextHeaderProps {
  pageContext: PageContext | null;
  isLoading: boolean;
  onRefresh: () => void;
  onClear?: () => void;
  hasMessages?: boolean;
}

export const PageContextHeader: React.FC<PageContextHeaderProps> = ({
  pageContext,
  isLoading,
  onRefresh,
  onClear,
  hasMessages = false,
}) => {
  const getContentTypeIcon = () => {
    switch (pageContext?.contentType) {
      case 'youtube':
        return <Youtube className="h-3.5 w-3.5 text-red-500" />;
      case 'article':
        return <FileText className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <Globe className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />;
    }
  };

  const getContentTypeLabel = () => {
    switch (pageContext?.contentType) {
      case 'youtube':
        return 'YouTube Video';
      case 'article':
        return 'Article';
      default:
        return 'Web Page';
    }
  };

  if (pageContext?.isRestricted) {
    return (
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-2.5 text-left text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              Page Restricted
            </span>
            <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
              {pageContext.restrictionReason ||
                'Internal browser pages cannot be read. Navigate to any standard website.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 text-amber-700 hover:text-amber-900 dark:text-amber-300 transition-colors"
            title="Refresh Page Context"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 p-2.5 text-left shadow-xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center justify-between gap-2">
        {/* Page Title & Icon */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {getContentTypeIcon()}
          <span
            className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
            title={pageContext?.title || 'Current Web Page'}
          >
            {pageContext?.title || 'Reading Web Page...'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {hasMessages && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
              title="Clear Conversation"
              aria-label="Clear Conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
            title="Refresh Page Context"
            aria-label="Refresh Page Context"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Metadata Pills */}
      {pageContext && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          <Badge variant="neutral" size="sm" className="px-1.5 py-0 text-[10px]">
            {getContentTypeLabel()}
          </Badge>

          {pageContext.domain && (
            <span className="truncate max-w-[140px]" title={pageContext.domain}>
              {pageContext.domain}
            </span>
          )}

          {pageContext.wordCount > 0 && (
            <>
              <span>•</span>
              <span>{pageContext.wordCount.toLocaleString()} words</span>
            </>
          )}

          {pageContext.sections.length > 0 && (
            <>
              <span>•</span>
              <span>{pageContext.sections.length} sections</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PageContextHeader;
