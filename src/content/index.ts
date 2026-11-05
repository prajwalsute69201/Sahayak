/**
 * Sahayak - Content Script
 * Injected into active pages to extract content, scan elements, and execute actions.
 */

import { extractArticleFromDocument } from './readabilityReader';
import { extractMetadataFromDOM } from '@/features/youtube-summary/services/youtube-metadata.service';
import { scannerController } from '@/features/element-scanner/content/scanner-controller';
import { agentContentExecutor } from '@/features/agent/content/agent-content-executor';

// Listen for messages from Side Panel or Background Service Worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // 1. Agent Action Execution (Slice 12)
  if (message?.type === 'EXECUTE_AGENT_ACTION') {
    agentContentExecutor
      .execute(message.action, message.approvalToken)
      .then((result) => sendResponse(result))
      .catch((err) => {
        sendResponse({
          actionId: message?.action?.id || 'unknown',
          actionType: message?.action?.type || 'click_element',
          status: 'failed',
          message: err instanceof Error ? err.message : String(err),
          dispatchedAt: Date.now(),
          durationMs: 0,
        });
      });
    return true; // Keep async channel open
  }

  // 2. Element Scanner Messages (Slice 10)
  if (
    message?.type === 'SCAN_ELEMENTS' ||
    message?.type === 'TOGGLE_BADGES' ||
    message?.type === 'HIGHLIGHT_ELEMENT' ||
    message?.type === 'CLEAR_HIGHLIGHT' ||
    message?.type === 'STOP_SCANNER' ||
    message?.type === 'GET_SCAN_STATUS'
  ) {
    return scannerController.handleMessage(message, sendResponse);
  }

  if (message?.type === 'EXTRACT_ARTICLE' || message?.type === 'EXTRACT_PAGE_CONTEXT') {
    const result = extractArticleFromDocument(document);
    sendResponse(result);
    return true; // Keep message channel open for async response
  }

  if (message?.type === 'GET_YOUTUBE_METADATA') {
    const metadata = extractMetadataFromDOM(document);
    sendResponse(metadata);
    return true;
  }

  if (message?.type === 'SEEK_YOUTUBE_VIDEO') {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (video && typeof message.seconds === 'number') {
      video.currentTime = message.seconds;
      if (video.paused) {
        video.play().catch(() => {});
      }
      sendResponse({ success: true, currentTime: video.currentTime });
    } else {
      sendResponse({ success: false, error: 'No video element found' });
    }
    return true;
  }
});

console.log('[Sahayak] Content Script initialized.');
