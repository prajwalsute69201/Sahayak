/**
 * Sahayak Element List Component
 * Renders searchable and filterable list of scanned interactive elements.
 */

import React from 'react';
import { ScannedElement } from '../types/element-scanner.types';
import ElementCard from './ElementCard';
import Input from '@/components/common/Input';
import EmptyState from '@/components/common/EmptyState';
import { Search, ListFilter, AlertCircle } from 'lucide-react';

interface ElementListProps {
  elements: ScannedElement[];
  totalElementsCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedActionId: number | null;
  onHighlightElement: (actionId: number) => void;
}

export const ElementList: React.FC<ElementListProps> = ({
  elements,
  totalElementsCount,
  searchQuery,
  onSearchChange,
  selectedActionId,
  onHighlightElement,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {/* Search Input */}
      {totalElementsCount > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by label, tag, or selector..."
            className="text-xs h-8 pl-8"
          />
        </div>
      )}

      {/* Elements Listing */}
      {elements.length > 0 ? (
        <div className="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto pr-0.5">
          {elements.map((el) => (
            <ElementCard
              key={el.actionId}
              element={el}
              isHighlighted={selectedActionId === el.actionId}
              onHighlight={onHighlightElement}
            />
          ))}
        </div>
      ) : totalElementsCount > 0 ? (
        <EmptyState
          icon={ListFilter}
          title="No Matching Elements"
          description={`No interactive elements found matching "${searchQuery}".`}
          className="py-6"
        />
      ) : (
        <EmptyState
          icon={AlertCircle}
          title="No Interactive Elements"
          description="No buttons, inputs, links, or form controls were detected on this page."
          className="py-6"
        />
      )}
    </div>
  );
};

export default ElementList;
