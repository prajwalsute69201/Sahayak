/**
 * Sahayak Local Profile Memory Types
 * Strict on-device, privacy-first personal memory definitions.
 */

export type MemoryCategory =
  | 'preferences'
  | 'personal_profile'
  | 'work_context'
  | 'language_preferences'
  | 'interaction_preferences'
  | 'custom';

export type MemorySource = 'explicit_instruction' | 'manual_entry' | 'suggestion_accepted';

export interface MemoryRecord {
  /** Unique ID */
  id: string;
  /** Categorical classification */
  category: MemoryCategory;
  /** Short summary title (e.g., "Response Style: Concise") */
  title: string;
  /** Full content of the memory */
  content: string;
  /** Searchable tags */
  tags: string[];
  /** Origin of the memory */
  source: MemorySource;
  /** Whether the user approved this memory (strictly true for stored items) */
  isApproved: boolean;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last modified */
  updatedAt: string;
  /** Optional confidence score (0.0 to 1.0) */
  confidence?: number;
}

export type MemoryProposalAction = 'create' | 'update' | 'delete';

export interface MemoryProposal {
  /** Unique ID for the proposal */
  id: string;
  /** Action proposed */
  action: MemoryProposalAction;
  /** Target category */
  category: MemoryCategory;
  /** Proposed title */
  title: string;
  /** Proposed content */
  content: string;
  /** Extracted or proposed tags */
  tags: string[];
  /** Proposed source */
  source: MemorySource;
  /** Confidence score of the extraction (0.0 to 1.0) */
  confidence: number;
  /** Target existing memory ID if action is update or delete */
  targetMemoryId?: string;
  /** Existing memory record if action is update or delete */
  existingMemory?: MemoryRecord;
  /** Raw trigger text that prompted this proposal */
  triggerText: string;
}

export interface MemorySettings {
  /** Master toggle: inject relevant user context into AI prompts */
  personalizationEnabled: boolean;
  /** Suggestion toggle: proactively suggest remembering preferences */
  suggestionsEnabled: boolean;
  /** Maximum number of memory items injected into prompt context (3-5) */
  maxContextItems: number;
}

export interface MemoryStorageCollection {
  version: number;
  memories: MemoryRecord[];
  updatedAt: string;
}

export interface MemoryFilter {
  category?: MemoryCategory | 'all';
  searchQuery?: string;
  tag?: string;
}

export interface MemoryStorageStats {
  count: number;
  maxCount: number;
  estimatedSizeBytes: number;
  percentageUsed: number;
}
