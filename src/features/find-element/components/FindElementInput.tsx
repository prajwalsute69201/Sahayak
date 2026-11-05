/**
 * Sahayak "Find It For Me" Input Component
 * Provides natural-language search bar with quick suggested query chips.
 */

import React, { KeyboardEvent } from 'react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { Search, Sparkles, X, CornerDownLeft } from 'lucide-react';
import { SUGGESTED_EXAMPLE_QUERIES } from '../types/find-element.types';

interface FindElementInputProps {
  query: string;
  isSearching: boolean;
  onQueryChange: (q: string) => void;
  onSearch: (q?: string) => void;
  onClear: () => void;
}

export const FindElementInput: React.FC<FindElementInputProps> = ({
  query,
  isSearching,
  onQueryChange,
  onSearch,
  onClear,
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim().length > 0 && !isSearching) {
        onSearch();
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Search Input Box */}
      <div className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe element (e.g. 'find the login button')..."
            className="text-xs h-9 pl-8 pr-7"
            disabled={isSearching}
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onSearch()}
          disabled={query.trim().length === 0 || isSearching}
          isLoading={isSearching}
          className="h-9 px-3 text-xs font-semibold"
          title="Find element on page"
        >
          {!isSearching && <CornerDownLeft className="h-3.5 w-3.5 mr-1" />}
          Find
        </Button>
      </div>

      {/* Suggested Quick Queries */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-left">
        <span className="flex items-center gap-1 text-[10px] text-slate-400 whitespace-nowrap">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Try:
        </span>
        {SUGGESTED_EXAMPLE_QUERIES.slice(0, 4).map((eg) => (
          <button
            key={eg.id}
            type="button"
            onClick={() => {
              onQueryChange(eg.text);
              onSearch(eg.text);
            }}
            disabled={isSearching}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 whitespace-nowrap dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/60 dark:hover:text-blue-300"
            title={eg.hint}
          >
            {eg.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FindElementInput;
