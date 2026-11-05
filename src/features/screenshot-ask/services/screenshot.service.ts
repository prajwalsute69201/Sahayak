/**
 * Screenshot Service
 * Captures visible browser tab viewport via Chrome Extension APIs with URL safety boundaries.
 */

import { RawScreenshot, SupportedImageFormat } from '../types/screenshot.types';

export class ScreenshotService {
  /**
   * Internal restricted URL protocols and patterns that Chrome extensions cannot capture
   */
  private static readonly RESTRICTED_PATTERNS = [
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^edge:\/\//i,
    /^about:/i,
    /^view-source:/i,
    /^devtools:\/\//i,
    /^https?:\/\/chromewebstore\.google\.com/i,
  ];

  /**
   * Evaluates whether a given URL is eligible for browser viewport screenshot capture.
   */
  public isUrlCapturable(url?: string): { capturable: boolean; reason?: string } {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return {
        capturable: false,
        reason: 'No active webpage URL detected.',
      };
    }

    for (const pattern of ScreenshotService.RESTRICTED_PATTERNS) {
      if (pattern.test(url.trim())) {
        return {
          capturable: false,
          reason:
            'Chrome security policy prevents extensions from capturing internal browser pages or the Chrome Web Store. Please navigate to a standard public website.',
        };
      }
    }

    return { capturable: true };
  }

  /**
   * Captures the visible viewport of the active browser tab.
   * Throws descriptive errors if the tab is unsupported or capture fails.
   */
  public async captureActiveTab(format: 'png' | 'jpeg' = 'png'): Promise<RawScreenshot> {
    if (typeof chrome === 'undefined' || !chrome.tabs?.captureVisibleTab) {
      throw new Error(
        'Chrome Tabs API is unavailable in this environment. Please run within a Chrome extension context.'
      );
    }

    // 1. Resolve active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      throw new Error('No active browser tab found to capture.');
    }

    // 2. Validate URL safety boundary
    const check = this.isUrlCapturable(activeTab.url);
    if (!check.capturable) {
      throw new Error(check.reason || 'Cannot capture screenshot of this page.');
    }

    // 3. Capture visible tab
    const mimeType: SupportedImageFormat = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const windowId = activeTab.windowId ?? undefined;

    return new Promise<RawScreenshot>((resolve, reject) => {
      try {
        const options: chrome.tabs.CaptureVisibleTabOptions = {
          format,
          ...(format === 'jpeg' ? { quality: 90 } : {}),
        };

        const callback = (dataUrl?: string) => {
          if (chrome.runtime?.lastError) {
            return reject(
              new Error(chrome.runtime.lastError.message || 'Failed to capture browser tab.')
            );
          }

          if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.trim().length === 0) {
            return reject(
              new Error(
                'Screenshot capture returned empty data. Ensure the browser window is visible and active.'
              )
            );
          }

          resolve({
            dataUrl,
            mimeType,
            tabId: activeTab.id,
            windowId: activeTab.windowId,
            pageTitle: activeTab.title,
            pageUrl: activeTab.url,
            timestamp: Date.now(),
          });
        };

        // windowId can be passed or null for current window
        const res = chrome.tabs.captureVisibleTab(windowId ?? null, options, callback) as unknown;

        // Support Promise-based returns in modern Chrome or mocks
        if (
          res &&
          typeof res === 'object' &&
          'then' in res &&
          typeof (res as Promise<string>).then === 'function'
        ) {
          (res as Promise<string>)
            .then((dataUrl) => {
              if (dataUrl) callback(dataUrl);
            })
            .catch((err) => {
              reject(new Error(err?.message || 'Failed to capture browser tab via Promise API.'));
            });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown screenshot capture failure.';
        reject(new Error(`Screenshot capture exception: ${msg}`));
      }
    });
  }
}

export const screenshotService = new ScreenshotService();
export default screenshotService;
