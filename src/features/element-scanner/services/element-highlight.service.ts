/**
 * Sahayak Element Highlight Service
 * Handles visual element selection, smooth viewport scrolling,
 * and high-contrast pulsing indicators in the active document.
 */

import { scannerOverlay } from '../content/scanner-overlay';
import { elementDetectorService } from './element-detector.service';

export class ElementHighlightService {
  /**
   * Highlights the element identified by actionId and smoothly centers it in view.
   */
  public highlight(actionId: number): boolean {
    const el = elementDetectorService.getElementByActionId(actionId);
    if (!el) {
      console.warn(`[Sahayak Scanner] Element with actionId ${actionId} not found.`);
      return false;
    }

    return scannerOverlay.highlightElement(actionId);
  }

  /**
   * Clears any active highlight on the page.
   */
  public clear(): void {
    scannerOverlay.clearHighlight();
  }
}

export const elementHighlightService = new ElementHighlightService();
