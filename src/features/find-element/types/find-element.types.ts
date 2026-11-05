/**
 * Sahayak "Find It For Me" Type Definitions (Slice 11)
 * Defines structured schemas for natural-language element queries,
 * matching candidates, AI response contracts, and ranking models.
 */

import { ScannedElement, ElementCategory } from '@/features/element-scanner';

export interface ElementMatch {
  /** Stable 1-based actionId corresponding to Slice 10 ScannedElement */
  actionId: number;
  /** Complete reference to the matched scanned element */
  element: ScannedElement;
  /** Normalized confidence score between 0.0 (unlikely) and 1.0 (certain) */
  confidence: number;
  /** Human-readable rationale explaining why this element matched the query */
  reason: string;
  /** Origin of the match determination */
  source: 'local' | 'ai' | 'hybrid';
}

export interface ElementMatchResult {
  /** The original natural-language query */
  query: string;
  /** Ranked list of candidate matches, sorted descending by confidence */
  matches: ElementMatch[];
  /** Highest ranking match, or null if no matches meet minimum threshold */
  bestMatch: ElementMatch | null;
  /** Whether the user's query is ambiguous and requires clarification */
  clarificationNeeded: boolean;
  /** Contextual follow-up question when clarification is needed */
  clarificationQuestion?: string;
  /** True when no elements matched the query above confidence threshold */
  notFound: boolean;
  /** Execution latency in milliseconds */
  durationMs: number;
  /** Primary matching strategy employed */
  matchSource: 'local' | 'ai' | 'hybrid';
}

export interface RawAIMatch {
  actionId: number;
  confidence: number;
  reason: string;
}

export interface RawAIMatchResponse {
  matches: RawAIMatch[];
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  notFound?: boolean;
}

export interface ExampleQuery {
  id: string;
  text: string;
  hint: string;
  category?: ElementCategory;
}

export const SUGGESTED_EXAMPLE_QUERIES: ExampleQuery[] = [
  {
    id: 'login',
    text: 'Find the login button',
    hint: 'Locates sign in, login, or account access buttons',
    category: 'primary-action',
  },
  {
    id: 'search',
    text: 'Search bar kahan hai?',
    hint: 'Finds the main search input or query box',
    category: 'search-field',
  },
  {
    id: 'email',
    text: 'Show me the email input field',
    hint: 'Locates email input fields in forms',
    category: 'form-input',
  },
  {
    id: 'cart',
    text: 'Locate add to cart button',
    hint: 'Finds shopping cart or purchase triggers',
    category: 'primary-action',
  },
  {
    id: 'download',
    text: 'Download report ka button dhoondo',
    hint: 'Locates download or export actions',
    category: 'primary-action',
  },
  {
    id: 'nav',
    text: 'Find the navigation menu',
    hint: 'Finds main navbar links or menu toggles',
    category: 'navigation',
  },
  {
    id: 'next',
    text: 'Next page button dikhao',
    hint: 'Finds pagination or next step controls',
    category: 'navigation',
  },
];
