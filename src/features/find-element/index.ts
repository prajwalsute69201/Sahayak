/**
 * Sahayak "Find It For Me" Feature Module (Slice 11)
 * Barrel export for natural-language element search, hybrid ranking,
 * AI matching, and element location UI.
 */

export * from './types/find-element.types';
export * from './services/local-matcher.service';
export * from './services/ai-matcher.service';
export * from './services/match-ranking.service';
export * from './services/match-validation.service';
export * from './services/element-search.service';
export * from './hooks/useFindElement';
export * from './components/FindElementInput';
export * from './components/MatchNavigation';
export * from './components/ElementMatchCard';
export * from './components/ElementMatchList';
export * from './components/ClarificationPrompt';
export * from './components/FindElementPanel';
