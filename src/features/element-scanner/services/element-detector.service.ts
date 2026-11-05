/**
 * Sahayak Element Detector Service
 * Traverses the DOM to identify, filter, classify, and register all interactive
 * candidate elements on the active webpage into a structured Action Map.
 */

import { ScannedElement, ScanSummary, ScanResult } from '../types/element-scanner.types';
import { elementMetadataService } from './element-metadata.service';
import { elementClassifierService } from './element-classifier.service';

export class ElementDetectorService {
  /** Internal registry mapping session actionId to live DOM HTMLElement */
  private elementMap: Map<number, HTMLElement> = new Map();

  /** Interactive candidate selectors */
  private readonly CANDIDATE_SELECTORS = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="combobox"]',
    '[role="searchbox"]',
    '[role="textbox"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[contenteditable="true"]',
    '[tabindex="0"]',
    '[onclick]',
  ].join(', ');

  /**
   * Scans the document and returns a structured ScanResult.
   */
  public scanDocument(doc: Document = document): ScanResult {
    this.elementMap.clear();

    const candidates = Array.from(doc.querySelectorAll(this.CANDIDATE_SELECTORS)) as HTMLElement[];
    const elements: ScannedElement[] = [];
    const seenElements = new Set<HTMLElement>();

    let nextActionId = 1;

    for (const el of candidates) {
      // 1. Skip if already visited or invalid
      if (seenElements.has(el)) continue;

      // 2. Ignore Sahayak's own overlay host and shadow DOM nodes
      if (
        el.closest('#sahayak-element-scanner-overlay') ||
        el.id === 'sahayak-element-scanner-overlay'
      ) {
        continue;
      }

      // 3. Skip <input type="hidden">
      if (el instanceof HTMLInputElement && el.type === 'hidden') {
        continue;
      }

      // 4. Check visibility (must be rendered in DOM)
      const isVisible = elementMetadataService.isElementVisible(el);
      if (!isVisible) {
        continue;
      }

      // 5. Avoid duplicate child detection inside parent button or link
      // E.g., <button><span>Click</span></button> -> only track <button>
      const parentInteractive = el.parentElement?.closest('button, a[href], [role="button"]');
      if (
        parentInteractive &&
        parentInteractive !== el &&
        candidates.includes(parentInteractive as HTMLElement)
      ) {
        continue;
      }

      // 6. Extract metadata
      const isEnabled = elementMetadataService.isElementEnabled(el);
      const label = elementMetadataService.getAccessibleLabel(el);
      const category = elementClassifierService.classifyElement(el, label);
      const rect = elementMetadataService.computeBoundingBox(el);
      const selector = elementMetadataService.computeCssSelector(el);

      const actionId = nextActionId++;
      this.elementMap.set(actionId, el);
      seenElements.add(el);

      const scanned: ScannedElement = {
        actionId,
        elementId: el.id || undefined,
        tagName: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || undefined,
        category,
        label,
        role: el.getAttribute('role') || undefined,
        ariaLabel: el.getAttribute('aria-label') || undefined,
        placeholder: el.getAttribute('placeholder') || undefined,
        name: el.getAttribute('name') || undefined,
        href: el instanceof HTMLAnchorElement ? el.href : undefined,
        isVisible,
        isEnabled,
        isFocused: doc.activeElement === el,
        rect,
        selector,
        safetyMetadata: elementMetadataService.extractSafetyMetadata(el, label),
      };

      elements.push(scanned);
    }

    // Build category summary
    const summary: ScanSummary = {
      totalCount: elements.length,
      categories: {
        navigation: elements.filter((e) => e.category === 'navigation').length,
        'primary-action': elements.filter((e) => e.category === 'primary-action').length,
        'secondary-action': elements.filter((e) => e.category === 'secondary-action').length,
        'form-input': elements.filter((e) => e.category === 'form-input').length,
        'search-field': elements.filter((e) => e.category === 'search-field').length,
        'media-control': elements.filter((e) => e.category === 'media-control').length,
        other: elements.filter((e) => e.category === 'other').length,
      },
      timestamp: Date.now(),
      url: doc.location?.href || '',
      title: doc.title || 'Untitled Page',
    };

    return {
      success: true,
      elements,
      summary,
    };
  }

  /**
   * Retrieves the live DOM element for a given action ID.
   */
  public getElementByActionId(actionId: number): HTMLElement | undefined {
    return this.elementMap.get(actionId);
  }

  /**
   * Clears registered element map.
   */
  public clear(): void {
    this.elementMap.clear();
  }
}

export const elementDetectorService = new ElementDetectorService();
