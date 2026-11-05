/**
 * Context Menu Registration & Handler Service
 * Registers nested context menus and handles user click events in Chrome MV3.
 */

import {
  ContextActionPayload,
  ContextActionType,
  PENDING_CONTEXT_ACTION_KEY,
} from '../types/context-menu.types';

export const CONTEXT_MENU_IDS = {
  ROOT: 'sahayak-root',
  EXPLAIN: 'sahayak-explain',
  SUMMARIZE: 'sahayak-summarize',
  TRANSLATE: 'sahayak-translate',
  REWRITE: 'sahayak-rewrite',
  ASK: 'sahayak-ask',
} as const;

export const MENU_ID_TO_ACTION: Record<string, ContextActionType> = {
  [CONTEXT_MENU_IDS.EXPLAIN]: 'explain',
  [CONTEXT_MENU_IDS.SUMMARIZE]: 'summarize',
  [CONTEXT_MENU_IDS.TRANSLATE]: 'translate',
  [CONTEXT_MENU_IDS.REWRITE]: 'rewrite',
  [CONTEXT_MENU_IDS.ASK]: 'ask',
};

export class ContextMenuService {
  /**
   * Registers context menus in Chrome, preventing duplicate registrations.
   */
  public async registerContextMenus(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.contextMenus) {
      return;
    }

    const createAllMenus = () => {
      // 1. Parent "Sahayak" Menu Item
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_IDS.ROOT,
          title: 'Sahayak',
          contexts: ['selection', 'action'],
        },
        () => {
          if (chrome.runtime?.lastError) {
            // Harmless duplicate catch
          }
        }
      );

      // 2. Child Actions
      const childItems = [
        { id: CONTEXT_MENU_IDS.EXPLAIN, title: 'Explain Selection' },
        { id: CONTEXT_MENU_IDS.SUMMARIZE, title: 'Summarize Selection' },
        { id: CONTEXT_MENU_IDS.TRANSLATE, title: 'Translate Selection' },
        { id: CONTEXT_MENU_IDS.REWRITE, title: 'Rewrite Selection' },
        { id: CONTEXT_MENU_IDS.ASK, title: 'Ask Sahayak' },
      ];

      childItems.forEach((item) => {
        chrome.contextMenus.create(
          {
            id: item.id,
            parentId: CONTEXT_MENU_IDS.ROOT,
            title: item.title,
            contexts: ['selection'],
          },
          () => {
            if (chrome.runtime?.lastError) {
              // Harmless catch
            }
          }
        );
      });
    };

    return new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          createAllMenus();
          resolve();
        }
      };

      try {
        const maybePromise: unknown = chrome.contextMenus.removeAll(done);
        if (
          maybePromise &&
          typeof maybePromise === 'object' &&
          'then' in maybePromise &&
          typeof (maybePromise as Promise<void>).then === 'function'
        ) {
          (maybePromise as Promise<void>).then(done).catch(done);
        }
      } catch {
        done();
      }
    });
  }

  /**
   * Handles user click on a Sahayak context-menu item.
   */
  public async handleMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ): Promise<ContextActionPayload | null> {
    const menuItemId = String(info.menuItemId);
    const actionType = MENU_ID_TO_ACTION[menuItemId];

    if (!actionType) {
      return null;
    }

    const selectionText = info.selectionText?.trim() || '';
    const pageUrl = tab?.url || info.pageUrl || '';
    const pageTitle = tab?.title || '';

    const payload: ContextActionPayload = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actionType,
      selectionText,
      pageUrl,
      pageTitle,
      timestamp: Date.now(),
      tabId: tab?.id,
      windowId: tab?.windowId,
    };

    // 1. Persist pending action in local storage for sidepanel pickup
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({
        [PENDING_CONTEXT_ACTION_KEY]: payload,
      });
    }

    // 2. Open side panel if supported
    if (typeof chrome !== 'undefined' && chrome.sidePanel?.open) {
      try {
        const target = tab?.windowId
          ? { windowId: tab.windowId }
          : tab?.id
            ? { tabId: tab.id }
            : null;

        if (target) {
          const res = chrome.sidePanel.open(target);
          if (res && typeof res.catch === 'function') {
            res.catch((err: unknown) => {
              if (tab?.id && tab?.windowId) {
                const fallback = chrome.sidePanel.open({ tabId: tab.id });
                if (fallback && typeof fallback.catch === 'function') {
                  fallback.catch(() => {});
                }
              } else {
                console.warn('[Sahayak ContextMenu] Failed to open side panel:', err);
              }
            });
          }
        }
      } catch (openErr) {
        console.warn('[Sahayak ContextMenu] Side panel open error:', openErr);
      }
    }

    // 3. Dispatch message to active side panel if already open
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const sendRes = chrome.runtime.sendMessage({
          type: 'CONTEXT_MENU_ACTION',
          payload,
        });
        if (sendRes && typeof sendRes.catch === 'function') {
          sendRes.catch(() => {});
        }
      } catch {
        // Ignored
      }
    }

    return payload;
  }
}

export const contextMenuService = new ContextMenuService();
export default contextMenuService;
