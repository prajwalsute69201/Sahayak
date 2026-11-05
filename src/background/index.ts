/**
 * Sahayak - Background Service Worker (Manifest V3)
 * Orchestrates extension lifecycle, tab capture, and side panel events.
 */

import { setupContextMenus } from './contextMenus';

// Enable side panel to open on extension action click
if (typeof chrome !== 'undefined' && chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[Sahayak SW] Failed to set side panel behavior:', error));
}

// Fallback toolbar click handler if setPanelBehavior is unsupported
if (typeof chrome !== 'undefined' && chrome.action?.onClicked) {
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id && chrome.sidePanel?.open) {
      chrome.sidePanel.open({ tabId: tab.id }).catch((err) => {
        console.warn('[Sahayak SW] Action click fallback failed to open side panel:', err);
      });
    }
  });
}

// Initialize Context Menus for Slice 7
setupContextMenus();

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[Sahayak SW] Installed/Updated successfully. Reason: ${details.reason}`);
  setupContextMenus();
});
