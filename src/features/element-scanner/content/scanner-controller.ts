/**
 * Sahayak Scanner Controller (Content Script Domain)
 * Coordinates element scanning, badge rendering, dynamic DOM observation,
 * and message dispatch within the active browser tab.
 */

import { ScanResult, ScannerMessage } from '../types/element-scanner.types';
import { elementDetectorService } from '../services/element-detector.service';
import { scannerOverlay } from './scanner-overlay';
import { dynamicDOMObserverService } from '../services/mutation-observer.service';
import { elementHighlightService } from '../services/element-highlight.service';

export class ScannerController {
  private isScanningActive: boolean = false;
  private badgesVisible: boolean = true;
  private lastResult: ScanResult | null = null;

  /**
   * Initializes message listener if running inside browser extension environment.
   */
  public init(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message: ScannerMessage, _sender, sendResponse) => {
        return this.handleMessage(message, sendResponse);
      });
    }
  }

  /**
   * Handles incoming scanner messages from the extension side panel.
   */
  public handleMessage(
    message: ScannerMessage,
    sendResponse: (response: unknown) => void
  ): boolean | void {
    if (!message || typeof message.type !== 'string') return;

    switch (message.type) {
      case 'SCAN_ELEMENTS': {
        const showBadges = message.options?.showBadges !== false;
        this.badgesVisible = showBadges;
        this.isScanningActive = true;

        const result = this.performScan(showBadges);
        sendResponse(result);
        return true;
      }

      case 'TOGGLE_BADGES': {
        this.badgesVisible = message.visible;
        scannerOverlay.setBadgesVisible(message.visible);
        sendResponse({ success: true, visible: this.badgesVisible });
        return true;
      }

      case 'HIGHLIGHT_ELEMENT': {
        const success = elementHighlightService.highlight(message.actionId);
        sendResponse({ success, actionId: message.actionId });
        return true;
      }

      case 'CLEAR_HIGHLIGHT': {
        elementHighlightService.clear();
        sendResponse({ success: true });
        return true;
      }

      case 'STOP_SCANNER': {
        this.stop();
        sendResponse({ success: true });
        return true;
      }

      case 'GET_SCAN_STATUS': {
        sendResponse({
          isActive: this.isScanningActive,
          badgesVisible: this.badgesVisible,
          summary: this.lastResult?.summary || null,
        });
        return true;
      }

      default:
        break;
    }
  }

  /**
   * Executes a full scan of the active document.
   */
  public performScan(showBadges: boolean = true): ScanResult {
    try {
      const result = elementDetectorService.scanDocument(document);
      this.lastResult = result;

      scannerOverlay.renderOverlay(result.elements, showBadges);

      // Start observing dynamic mutations
      dynamicDOMObserverService.startObserving(() => {
        this.handleDynamicUpdate();
      });

      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        elements: [],
        summary: {
          totalCount: 0,
          categories: {
            navigation: 0,
            'primary-action': 0,
            'secondary-action': 0,
            'form-input': 0,
            'search-field': 0,
            'media-control': 0,
            other: 0,
          },
          timestamp: Date.now(),
          url: window.location?.href || '',
          title: document.title || '',
        },
        error: errorMsg,
      };
    }
  }

  /**
   * Stops scanner, observer, and removes Shadow DOM overlay.
   */
  public stop(): void {
    this.isScanningActive = false;
    dynamicDOMObserverService.stopObserving();
    scannerOverlay.destroy();
    elementDetectorService.clear();
    this.lastResult = null;
  }

  /**
   * Handles dynamic DOM additions or modifications.
   */
  private handleDynamicUpdate(): void {
    if (!this.isScanningActive) return;

    try {
      const result = elementDetectorService.scanDocument(document);
      this.lastResult = result;
      scannerOverlay.renderOverlay(result.elements, this.badgesVisible);

      // Broadcast update to Side Panel if open
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime
          .sendMessage({
            type: 'ELEMENTS_UPDATED',
            elements: result.elements,
            summary: result.summary,
          })
          .catch(() => {
            // Ignore error when Side Panel is closed or not listening
          });
      }
    } catch (e) {
      console.warn('[Sahayak Scanner] Dynamic update error:', e);
    }
  }
}

export const scannerController = new ScannerController();
