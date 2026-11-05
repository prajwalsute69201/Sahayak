/**
 * Grounded Page Chat Types for Sahayak
 * Defines representations for Page Context, Sections, Retrieval, Grounding, and Streaming Chat.
 */

export type PageContentType = 'article' | 'webpage' | 'youtube' | 'generic';

export interface PageSection {
  id: string;
  heading: string;
  level: number;
  content: string;
  wordCount: number;
  charCount: number;
  isPrimary?: boolean;
}

export interface PageLink {
  text: string;
  url: string;
}

export interface PageContext {
  id: string;
  tabId?: number;
  url: string;
  title: string;
  domain: string;
  byline?: string;
  siteName?: string;
  contentType: PageContentType;
  mainContent: string;
  sections: PageSection[];
  links: PageLink[];
  wordCount: number;
  extractedAt: number;
  isTruncated: boolean;
  language?: string;
  isRestricted?: boolean;
  restrictionReason?: string;
}

export interface RetrievedSection extends PageSection {
  relevanceScore: number;
  matchReasons: string[];
}

export interface RetrievedContext {
  pageTitle: string;
  pageUrl: string;
  domain: string;
  contentType: PageContentType;
  sections: RetrievedSection[];
  totalRetrievedWords: number;
  isPartialContext: boolean;
  unretrievedSectionCount: number;
  suggestedQuestions?: string[];
}

export type MessageRole = 'user' | 'model' | 'system';

export type MessageStatus = 'idle' | 'streaming' | 'complete' | 'interrupted' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  status: MessageStatus;
  error?: string;
  sourceSections?: string[];
  isGrounded?: boolean;
  language?: 'en' | 'hi-en' | 'auto';
}

export interface ConversationSession {
  sessionKey: string; // e.g. `${tabId}:${url}`
  tabId?: number;
  url: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export type ChatStatus =
  'idle' | 'loading-context' | 'ready' | 'generating' | 'interrupted' | 'error';
