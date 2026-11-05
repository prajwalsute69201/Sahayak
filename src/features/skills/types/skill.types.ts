/**
 * Sahayak Skill Types
 * Strongly typed definitions for reusable AI workflows, parameter definitions,
 * execution records, and portable JSON packages.
 */

export type SkillCategory =
  | 'summarization'
  | 'research'
  | 'productivity'
  | 'writing'
  | 'navigation'
  | 'page_interaction'
  | 'custom';

export type SkillSource = 'built_in' | 'user_created';

export type SupportedPageType = 'any' | 'article' | 'youtube' | 'interactive' | 'selection';

export type SkillExecutionRoute =
  'summarize' | 'youtube' | 'chat' | 'rewrite' | 'find_element' | 'agent_action';

export type SkillParameterType = 'string' | 'number' | 'boolean' | 'select';

export interface SkillParameter {
  /** Template variable identifier used as {{name}} */
  name: string;
  /** Human-readable input label */
  label: string;
  /** Optional helper description */
  description?: string;
  /** Primitive parameter type */
  type: SkillParameterType;
  /** Default fallback value */
  defaultValue?: string | number | boolean;
  /** Allowed options for 'select' parameter type */
  options?: string[];
  /** Whether the user must provide a value before running */
  required: boolean;
  /** Input placeholder */
  placeholder?: string;
}

export interface Skill {
  /** Unique ID */
  id: string;
  /** Display name */
  name: string;
  /** Short summary of what the skill does */
  description: string;
  /** Categorical classification */
  category: SkillCategory;
  /** Lucide icon name */
  icon: string;
  /** Prompt template with {{var}} placeholders */
  instructionTemplate: string;
  /** Required and optional input parameters */
  parameters: SkillParameter[];
  /** Supported page contexts (e.g. article, youtube, selection, any) */
  supportedPageTypes: SupportedPageType[];
  /** Target feature execution engine */
  executionRoute: SkillExecutionRoute;
  /** Whether predefined or user-authored */
  source: SkillSource;
  /** Schema/skill version */
  version: number;
  /** Active status */
  isEnabled: boolean;
  /** User favorite/pinned */
  isFavorite: boolean;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  updatedAt: string;
}

export type SkillExecutionStatus =
  'started' | 'completed' | 'failed' | 'cancelled' | 'unsupported_context';

export interface SkillExecutionRecord {
  /** Unique execution record ID */
  executionId: string;
  /** Target skill ID */
  skillId: string;
  /** Skill name at execution time */
  skillName: string;
  /** Skill category */
  category: SkillCategory;
  /** Feature route executed */
  route: SkillExecutionRoute;
  /** Active browser tab ID if available */
  tabId?: number;
  /** Page URL at execution */
  pageUrl: string;
  /** Page title at execution */
  pageTitle: string;
  /** Execution status */
  status: SkillExecutionStatus;
  /** Final rendered instruction sent to AI */
  renderedInstruction: string;
  /** Parameter inputs supplied by user */
  inputs: Record<string, string | number | boolean>;
  /** Brief summary or textual output if available */
  outputSummary?: string;
  /** Error diagnostic message if failed */
  error?: string;
  /** ISO timestamp */
  startedAt: string;
  /** ISO timestamp */
  completedAt?: string;
  /** Total execution time in ms */
  durationMs?: number;
}

export interface SkillExportPackage {
  format: 'sahayak-skills';
  version: number;
  exportedAt: string;
  skills: Skill[];
}

export interface SkillFilter {
  category?: SkillCategory | 'all';
  searchQuery?: string;
  source?: 'all' | 'built_in' | 'user_created';
  onlyFavorites?: boolean;
}

export interface SkillPageContextInfo {
  url: string;
  title: string;
  isArticle: boolean;
  isYouTube: boolean;
  hasSelection: boolean;
  isRestricted: boolean;
  selectedText?: string;
}
