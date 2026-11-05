/**
 * Sahayak Element Metadata Service
 * Extracts accessible names, visibility attributes, bounding rectangles,
 * and structural metadata from DOM elements in compliance with WAI-ARIA specs.
 */

import { ElementBoundingBox, ElementSafetyMetadata } from '../types/element-scanner.types';

export class ElementMetadataService {
  /**
   * Resolves the human-readable accessible label for a DOM element.
   * Priority:
   * 1. aria-labelledby ID lookup
   * 2. aria-label
   * 3. Associated <label for="..."> or ancestor <label>
   * 4. placeholder (for inputs)
   * 5. title attribute
   * 6. alt attribute (for images within or on the element)
   * 7. value attribute (for button inputs, NEVER for passwords or user inputs)
   * 8. innerText or textContent (trimmed)
   * 9. Fallback based on tagName/role
   */
  public getAccessibleLabel(element: Element): string {
    // 1. Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const ids = labelledBy.split(/\s+/);
      const textParts: string[] = [];
      for (const id of ids) {
        const target = element.ownerDocument.getElementById(id);
        if (target) {
          const tText = target.textContent?.trim();
          if (tText) textParts.push(tText);
        }
      }
      if (textParts.length > 0) {
        return this.cleanText(textParts.join(' '));
      }
    }

    // 2. Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim().length > 0) {
      return this.cleanText(ariaLabel);
    }

    // 3. Associated <label>
    const id = element.getAttribute('id');
    if (id) {
      try {
        const labelEl = element.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (labelEl && labelEl.textContent?.trim()) {
          return this.cleanText(labelEl.textContent);
        }
      } catch {
        // Fall back if id has invalid selector characters
      }
    }

    const parentLabel = element.closest('label');
    if (parentLabel && parentLabel !== element) {
      // Remove text of the element itself if inside
      const labelClone = parentLabel.cloneNode(true) as HTMLElement;
      const innerInput = labelClone.querySelector(
        element.tagName.toLowerCase() + (id ? `#${CSS.escape(id)}` : '')
      );
      if (innerInput) {
        innerInput.remove();
      }
      const labelText = labelClone.textContent?.trim();
      if (labelText) {
        return this.cleanText(labelText);
      }
    }

    // 4. Placeholder
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && placeholder.trim().length > 0) {
      return this.cleanText(placeholder);
    }

    // 5. Title
    const title = element.getAttribute('title');
    if (title && title.trim().length > 0) {
      return this.cleanText(title);
    }

    // 6. Image alt attribute
    if (element.tagName.toLowerCase() === 'img') {
      const alt = element.getAttribute('alt');
      if (alt && alt.trim().length > 0) return this.cleanText(alt);
    }

    const innerImg = element.querySelector('img[alt]');
    if (innerImg) {
      const alt = innerImg.getAttribute('alt');
      if (alt && alt.trim().length > 0) return this.cleanText(alt);
    }

    // 7. Value attribute (Only for submit, button, reset inputs)
    if (element instanceof HTMLInputElement) {
      const inputType = (element.type || '').toLowerCase();
      if (['button', 'submit', 'reset'].includes(inputType)) {
        if (element.value && element.value.trim().length > 0) {
          return this.cleanText(element.value);
        }
      }
      // Note: Never read password value or user text input value!
    }

    // 8. Text content
    const text = (element as HTMLElement).innerText || element.textContent || '';
    if (text.trim().length > 0) {
      return this.cleanText(text);
    }

    // 9. Semantic fallback
    const role = element.getAttribute('role');
    const tagName = element.tagName.toLowerCase();
    if (role) return `[${role}]`;
    if (tagName === 'button') return 'Button';
    if (tagName === 'a') return 'Link';
    if (tagName === 'input') {
      const inputType = element.getAttribute('type') || 'text';
      return `${inputType.charAt(0).toUpperCase() + inputType.slice(1)} Input`;
    }
    if (tagName === 'select') return 'Dropdown';
    if (tagName === 'textarea') return 'Text Area';

    return 'Interactive Element';
  }

  /**
   * Evaluates whether an element is visibly rendered on the screen.
   * Checks dimensions, computed display/visibility, opacity, and document presence.
   */
  public isElementVisible(element: Element): boolean {
    if (!element || !element.isConnected) {
      return false;
    }

    // Hidden attribute
    if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    // HTML input of type="hidden"
    if (element instanceof HTMLInputElement && element.type === 'hidden') {
      return false;
    }

    // Check client rects
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    // Computed style checks (if window.getComputedStyle is available)
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      try {
        const style = window.getComputedStyle(element);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.visibility === 'collapse' ||
          parseFloat(style.opacity || '1') < 0.05
        ) {
          return false;
        }

        // Check if an ancestor element is hidden
        let parent = element.parentElement;
        while (parent && parent !== element.ownerDocument.body) {
          const pStyle = window.getComputedStyle(parent);
          if (
            pStyle.display === 'none' ||
            pStyle.visibility === 'hidden' ||
            parseFloat(pStyle.opacity || '1') < 0.05
          ) {
            return false;
          }
          parent = parent.parentElement;
        }
      } catch {
        // Fall back to rect dimensions if computedStyle fails (e.g. in some jsdom environments)
      }
    }

    return true;
  }

  /**
   * Determines whether the element is interactable (not disabled).
   */
  public isElementEnabled(element: Element): boolean {
    if (
      element.hasAttribute('disabled') ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.classList.contains('disabled')
    ) {
      return false;
    }

    if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
      if (element.disabled) return false;
    }

    return true;
  }

  /**
   * Computes absolute viewport bounding rectangle.
   */
  public computeBoundingBox(element: Element): ElementBoundingBox {
    const rect = element.getBoundingClientRect();
    return {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      bottom: Math.round(rect.bottom),
      right: Math.round(rect.right),
    };
  }

  /**
   * Generates a concise CSS selector for the element.
   */
  public computeCssSelector(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute('id');
    if (id && /^[a-zA-Z][\w-]*$/.test(id)) {
      return `${tag}#${id}`;
    }

    const name = element.getAttribute('name');
    if (name) {
      return `${tag}[name="${name}"]`;
    }

    const role = element.getAttribute('role');
    if (role) {
      return `${tag}[role="${role}"]`;
    }

    const type = element.getAttribute('type');
    if (type) {
      return `${tag}[type="${type}"]`;
    }

    const classes = Array.from(element.classList).filter(
      (c) => !c.startsWith('sahayak') && !c.includes(':') && !c.includes('/')
    );
    if (classes.length > 0) {
      return `${tag}.${classes[0]}`;
    }

    return tag;
  }

  /**
   * Extracts non-sensitive, structural safety metadata for deterministic gating (Slice 16).
   * Note: NEVER reads, captures, or exposes password values, form input contents, or auth tokens.
   */
  public extractSafetyMetadata(element: Element, label: string): ElementSafetyMetadata {
    const form = element.closest('form');
    const isInsideForm = Boolean(form);
    const formAction = form?.getAttribute('action') || undefined;
    const formMethod = form?.getAttribute('method')?.toLowerCase() || undefined;

    const tagName = element.tagName.toLowerCase();
    const typeAttr = (element.getAttribute('type') || '').toLowerCase();
    const roleAttr = (element.getAttribute('role') || '').toLowerCase();
    const nameAttr = (element.getAttribute('name') || '').toLowerCase();
    const idAttr = (element.getAttribute('id') || '').toLowerCase();
    const autocompleteAttr = (element.getAttribute('autocomplete') || '').toLowerCase();
    const classListStr =
      typeof element.className === 'string' ? element.className.toLowerCase() : '';
    const normLabel = label.toLowerCase();

    // Submit control detection
    const isSubmitControl =
      typeAttr === 'submit' ||
      (tagName === 'button' && (!typeAttr || typeAttr === 'submit') && isInsideForm) ||
      (roleAttr === 'button' &&
        isInsideForm &&
        /(submit|sign in|login|register|checkout|apply)/i.test(normLabel));

    // Destructive styling or action detection
    const isDestructive =
      /(^|\s)(delete|remove|erase|wipe|destroy|terminate|danger|destructive)($|\s|-|_)/i.test(
        classListStr
      ) ||
      /(^|\s)(delete|remove|erase|wipe|destroy|terminate)($|\s|-|_)/i.test(normLabel) ||
      /(hatao|mita do|delete karo)/i.test(normLabel);

    // Password or sensitive field detection
    const isPasswordOrSensitiveField =
      typeAttr === 'password' ||
      /(password|passwd|otp|pin|cvv|cvc|ssn|credit[-_]?card|card[-_]?number)/i.test(nameAttr) ||
      /(password|passwd|otp|pin|cvv|cvc|ssn|credit[-_]?card|card[-_]?number)/i.test(idAttr) ||
      /(password|current-password|new-password|one-time-code|cc-number|cc-csc)/i.test(
        autocompleteAttr
      );

    return {
      isInsideForm,
      formAction,
      formMethod,
      isSubmitControl,
      isDestructive,
      isPasswordOrSensitiveField,
    };
  }

  /**
   * Cleans and normalizes extracted text.
   */
  private cleanText(raw: string): string {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (cleaned.length > 80) {
      return cleaned.slice(0, 77) + '...';
    }
    return cleaned;
  }
}

export const elementMetadataService = new ElementMetadataService();
