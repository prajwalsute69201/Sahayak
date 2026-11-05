/**
 * Sahayak Scanner Client Service (Side Panel Domain)
 * Dispatches scan requests, badge visibility toggles, and element highlight
 * commands from the extension UI to the active browser tab's content script.
 */

import { ScanResult, ScannerMessage } from '../types/element-scanner.types';
import { scannerController } from '../content/scanner-controller';

export class ScannerClientService {
  /**
   * Scans the currently active browser tab and returns detected elements.
   */
  public async scanActiveTab(showBadges: boolean = true): Promise<ScanResult> {
    // 1. Fallback for headless / test environments without active Chrome tab
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      if (typeof document !== 'undefined') {
        return scannerController.performScan(showBadges);
      }
      throw new Error('Browser tabs API is not available.');
    }

    // 2. Query active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      throw new Error('No active browser tab found. Please focus a web page and try again.');
    }

    const url = tab.url || '';

    // 3. Reject restricted internal browser protocols
    if (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.startsWith('view-source:') ||
      url.includes('chromewebstore.google.com')
    ) {
      throw new Error(
        'Chrome extensions cannot scan internal browser pages (chrome://, edge://, about:). Please navigate to a standard website.'
      );
    }

    // 4. Send SCAN_ELEMENTS message
    try {
      const response = await this.sendMessageToTab<ScanResult>(tab.id, {
        type: 'SCAN_ELEMENTS',
        options: { showBadges },
      });

      if (response && response.success) {
        return response;
      }

      if (response && response.error) {
        throw new Error(response.error);
      }
    } catch (msgErr: unknown) {
      const errStr = msgErr instanceof Error ? msgErr.message : String(msgErr);

      if (
        errStr.includes('Could not establish connection') ||
        errStr.includes('Receiving end does not exist')
      ) {
        throw new Error(
          'Sahayak content script is not yet connected to this page. Please refresh the webpage to enable scanning.'
        );
      }

      throw msgErr;
    }

    throw new Error('Failed to retrieve interactive elements from the webpage.');
  }

  /**
   * Toggles visibility of Shadow DOM badges on the active tab.
   */
  public async toggleBadges(visible: boolean): Promise<boolean> {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      scannerController.handleMessage({ type: 'TOGGLE_BADGES', visible }, () => {});
      return visible;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return false;

    try {
      await this.sendMessageToTab(tab.id, {
        type: 'TOGGLE_BADGES',
        visible,
      });
      return visible;
    } catch {
      return false;
    }
  }

  /**
   * Highlights a specific element on the active tab.
   */
  public async highlightElement(actionId: number): Promise<boolean> {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      let success = false;
      scannerController.handleMessage({ type: 'HIGHLIGHT_ELEMENT', actionId }, (res: unknown) => {
        success = Boolean((res as { success?: boolean })?.success);
      });
      return success;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return false;

    try {
      const res = await this.sendMessageToTab<{ success: boolean }>(tab.id, {
        type: 'HIGHLIGHT_ELEMENT',
        actionId,
      });
      return Boolean(res?.success);
    } catch {
      return false;
    }
  }

  /**
   * Clears active element highlight on the active tab.
   */
  public async clearHighlight(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      scannerController.handleMessage({ type: 'CLEAR_HIGHLIGHT' }, () => {});
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    try {
      await this.sendMessageToTab(tab.id, { type: 'CLEAR_HIGHLIGHT' });
    } catch {
      // Ignore
    }
  }

  /**
   * Stops scanner, observer, and overlay on the active tab.
   */
  public async stopScanner(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      scannerController.stop();
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    try {
      await this.sendMessageToTab(tab.id, { type: 'STOP_SCANNER' });
    } catch {
      // Ignore
    }
  }

  private sendMessageToTab<T>(tabId: number, message: ScannerMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response as T);
        }
      });
    });
  }
}

export const scannerClientService = new ScannerClientService();
