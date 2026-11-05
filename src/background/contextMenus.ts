/**
 * Background Context Menus Controller
 * Configures context-menu lifecycle and event dispatching.
 */

import { contextMenuService } from '@/features/context-menu/services/context-menu.service';

export function setupContextMenus(): void {
  if (typeof chrome === 'undefined' || !chrome.contextMenus) {
    return;
  }

  // Register menus
  contextMenuService.registerContextMenus().catch((err) => {
    console.error('[Sahayak SW] Failed to register context menus:', err);
  });

  // Listen for menu click events
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    contextMenuService.handleMenuClick(info, tab).catch((err) => {
      console.error('[Sahayak SW] Context menu click handling failed:', err);
    });
  });
}

export default setupContextMenus;
