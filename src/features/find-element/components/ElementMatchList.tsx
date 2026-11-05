/**
 * Sahayak Element Match List Component
 * Renders ranked candidate matches with interactive highlighting.
 */

import React from 'react';
import { ElementMatch } from '../types/find-element.types';
import ElementMatchCard from './ElementMatchCard';

interface ElementMatchListProps {
  matches: ElementMatch[];
  highlightedActionId: number | null;
  onHighlight: (actionId: number) => void;
}

export const ElementMatchList: React.FC<ElementMatchListProps> = ({
  matches,
  highlightedActionId,
  onHighlight,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {matches.map((match, index) => (
        <ElementMatchCard
          key={match.actionId}
          match={match}
          rank={index + 1}
          isHighlighted={highlightedActionId === match.actionId}
          onHighlight={onHighlight}
        />
      ))}
    </div>
  );
};

export default ElementMatchList;
