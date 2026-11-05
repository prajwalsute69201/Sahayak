/**
 * Types for Screenshot-and-Ask (Multimodal Vision) Feature
 */

export type SupportedImageFormat = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * Raw capture result directly from browser tab capture
 */
export interface RawScreenshot {
  dataUrl: string;
  mimeType: SupportedImageFormat;
  tabId?: number;
  windowId?: number;
  pageTitle?: string;
  pageUrl?: string;
  timestamp: number;
}

/**
 * Processed and validated screenshot ready for Gemini Vision
 */
export interface ProcessedScreenshot {
  dataUrl: string;
  base64Data: string; // Stripped base64 string without data: URL prefix
  mimeType: SupportedImageFormat;
  width: number;
  height: number;
  originalSizeBytes: number;
  processedSizeBytes: number;
  isCompressed: boolean;
  pageTitle?: string;
  pageUrl?: string;
  timestamp: number;
}

/**
 * Image validation result
 */
export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: SupportedImageFormat;
  sizeBytes?: number;
  dimensions?: { width: number; height: number };
}

/**
 * Visual chat message turn
 */
export interface VisualChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  isOcr?: boolean;
  latencyMs?: number;
}

/**
 * Common preset visual query types
 */
export type VisualActionPreset =
  'explain' | 'chart' | 'error' | 'ocr' | 'elements' | 'summary' | 'hinglish';

/**
 * Visual session state
 */
export interface VisualSessionState {
  screenshot: ProcessedScreenshot | null;
  messages: VisualChatMessage[];
  isCapturing: boolean;
  isProcessing: boolean;
  streamingText: string;
  error: string | null;
  warning: string | null;
}

/**
 * Screenshot capture error classifications
 */
export type ScreenshotErrorCode =
  | 'RESTRICTED_PAGE'
  | 'NO_ACTIVE_TAB'
  | 'WINDOW_MINIMIZED'
  | 'CAPTURE_FAILED'
  | 'IMAGE_TOO_LARGE'
  | 'INVALID_FORMAT'
  | 'API_ERROR';
