/**
 * Sahayak Interactive Element Scanner - Type Definitions (Slice 10)
 * Defines structured schemas for detected interactive DOM elements,
 * classification categories, badge styles, and scanner message protocols.
 */

export type ElementCategory =
  | 'navigation'
  | 'primary-action'
  | 'secondary-action'
  | 'form-input'
  | 'search-field'
  | 'media-control'
  | 'other';

export interface ElementBoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export interface ElementSafetyMetadata {
  /** Whether the element is nested within an HTML <form> */
  isInsideForm: boolean;
  /** Action URL of the enclosing form if present */
  formAction?: string;
  /** Submission method of the enclosing form (e.g. 'post', 'get') */
  formMethod?: string;
  /** Whether the element functions as a form submit trigger */
  isSubmitControl: boolean;
  /** Whether the element is marked or styled as destructive/consequential */
  isDestructive: boolean;
  /** Whether the element represents a password, OTP, CVV, or sensitive input */
  isPasswordOrSensitiveField: boolean;
}

export interface ScannedElement {
  /** Stable 1-based numeric identifier for the current scan session */
  actionId: number;
  /** HTML element ID attribute if present */
  elementId?: string;
  /** Lowercase tag name (e.g. 'button', 'a', 'input', 'select', 'textarea') */
  tagName: string;
  /** Type attribute for inputs and buttons (e.g. 'submit', 'text', 'checkbox') */
  type?: string;
  /** High-level functional classification */
  category: ElementCategory;
  /** Human-readable accessible label extracted from accessible tree or text */
  label: string;
  /** ARIA role if present or computed */
  role?: string;
  /** Explicit aria-label attribute value */
  ariaLabel?: string;
  /** Input placeholder if present */
  placeholder?: string;
  /** Input name attribute if present */
  name?: string;
  /** Destination URL for links */
  href?: string;
  /** Whether the element is currently visible and rendered on screen */
  isVisible: boolean;
  /** Whether the element is interactable (not disabled) */
  isEnabled: boolean;
  /** Whether the element currently has focus */
  isFocused?: boolean;
  /** Absolute bounding rectangle relative to document viewport */
  rect: ElementBoundingBox;
  /** Concise unique CSS selector */
  selector?: string;
  /** Element-level safety metadata (Slice 16) */
  safetyMetadata?: ElementSafetyMetadata;
}

export interface ScanSummary {
  totalCount: number;
  categories: Record<ElementCategory, number>;
  timestamp: number;
  url: string;
  title: string;
}

export interface ScanResult {
  success: boolean;
  elements: ScannedElement[];
  summary: ScanSummary;
  error?: string;
}

export interface CategoryBadgeConfig {
  shortCode: string;
  label: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

export const CATEGORY_BADGE_CONFIGS: Record<ElementCategory, CategoryBadgeConfig> = {
  navigation: {
    shortCode: 'NAV',
    label: 'Navigation',
    description: 'Links, menus, breadcrumbs, and pagination',
    backgroundColor: '#7c3aed', // Purple-600
    textColor: '#ffffff',
    borderColor: '#6d28d9',
  },
  'primary-action': {
    shortCode: 'ACTION',
    label: 'Primary Action',
    description: 'Submit buttons, primary CTAs, and major triggers',
    backgroundColor: '#2563eb', // Blue-600
    textColor: '#ffffff',
    borderColor: '#1d4ed8',
  },
  'secondary-action': {
    shortCode: 'SEC',
    label: 'Secondary Action',
    description: 'Cancel, dismiss, close, and reset actions',
    backgroundColor: '#4b5563', // Gray-600
    textColor: '#ffffff',
    borderColor: '#374151',
  },
  'form-input': {
    shortCode: 'FORM',
    label: 'Form Input',
    description: 'Text inputs, selects, textareas, and checkboxes',
    backgroundColor: '#059669', // Emerald-600
    textColor: '#ffffff',
    borderColor: '#047857',
  },
  'search-field': {
    shortCode: 'SEARCH',
    label: 'Search Field',
    description: 'Search inputs and query search boxes',
    backgroundColor: '#d97706', // Amber-600
    textColor: '#ffffff',
    borderColor: '#b45309',
  },
  'media-control': {
    shortCode: 'MEDIA',
    label: 'Media Control',
    description: 'Video, audio, play/pause, and volume buttons',
    backgroundColor: '#e11d48', // Rose-600
    textColor: '#ffffff',
    borderColor: '#be123c',
  },
  other: {
    shortCode: 'OTHER',
    label: 'Other Interactive',
    description: 'Dropdown toggles, accordions, and custom elements',
    backgroundColor: '#0284c7', // Sky-600
    textColor: '#ffffff',
    borderColor: '#0369a1',
  },
};

/** Message Protocol between Side Panel and Content Script */
export type ScannerMessageType =
  | 'SCAN_ELEMENTS'
  | 'TOGGLE_BADGES'
  | 'HIGHLIGHT_ELEMENT'
  | 'CLEAR_HIGHLIGHT'
  | 'STOP_SCANNER'
  | 'GET_SCAN_STATUS'
  | 'ELEMENTS_UPDATED';

export interface ScanElementsMessage {
  type: 'SCAN_ELEMENTS';
  options?: {
    showBadges?: boolean;
    filterCategory?: ElementCategory;
  };
}

export interface ToggleBadgesMessage {
  type: 'TOGGLE_BADGES';
  visible: boolean;
}

export interface HighlightElementMessage {
  type: 'HIGHLIGHT_ELEMENT';
  actionId: number;
}

export interface ClearHighlightMessage {
  type: 'CLEAR_HIGHLIGHT';
}

export interface StopScannerMessage {
  type: 'STOP_SCANNER';
}

export interface GetScanStatusMessage {
  type: 'GET_SCAN_STATUS';
}

export interface ElementsUpdatedMessage {
  type: 'ELEMENTS_UPDATED';
  elements: ScannedElement[];
  summary: ScanSummary;
}

export type ScannerMessage =
  | ScanElementsMessage
  | ToggleBadgesMessage
  | HighlightElementMessage
  | ClearHighlightMessage
  | StopScannerMessage
  | GetScanStatusMessage
  | ElementsUpdatedMessage;
