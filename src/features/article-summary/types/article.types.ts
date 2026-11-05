/**
 * TypeScript Interfaces for Article Extraction & Structured Summarization
 */

export interface ExtractedSection {
  heading: string;
  level: number;
  content: string;
}

export interface ExtractedLink {
  text: string;
  url: string;
}

export interface ExtractedArticle {
  title: string;
  byline?: string;
  siteName?: string;
  publishedTime?: string;
  textContent: string;
  length: number;
  wordCount: number;
  excerpt?: string;
  url: string;
  lang?: string;
  sections?: ExtractedSection[];
  links?: ExtractedLink[];
}

export interface StructuredSummary {
  overview: string;
  keyPoints: string[];
  detailedSummary: string;
  importantFacts: string[];
  conclusion: string;
  topicsAndKeywords: string[];
  generatedAt: number;
  language: 'auto' | 'en' | 'hi-en';
  modelUsed: string;
}

export type SummaryStepStatus = 'idle' | 'extracting' | 'summarizing' | 'success' | 'error';

export type ExtractionErrorCode =
  | 'NO_ACTIVE_TAB'
  | 'RESTRICTED_URL'
  | 'NO_READABLE_CONTENT'
  | 'EXTRACTION_TIMEOUT'
  | 'COMMUNICATION_ERROR';

export interface ExtractionResult {
  success: boolean;
  article?: ExtractedArticle;
  error?: {
    code: ExtractionErrorCode;
    message: string;
  };
}
