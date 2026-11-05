/**
 * Public Feature Barrel for Screenshot-and-Ask (Multimodal Vision)
 */

export * from './types/screenshot.types';
export * from './services/screenshot.service';
export * from './services/image-processing.service';
export * from './services/visual-context.service';
export * from './services/multimodal.service';
export * from './hooks/useScreenshotAsk';

export { default, VisualChat } from './components/VisualChat';
export { default as ScreenshotCapture } from './components/ScreenshotCapture';
export { default as ScreenshotPreview } from './components/ScreenshotPreview';
export { default as ScreenshotToolbar } from './components/ScreenshotToolbar';
export { default as VisualMessage } from './components/VisualMessage';
