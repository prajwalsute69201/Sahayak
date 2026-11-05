import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  elementDetectorService,
  elementMetadataService,
  scannerOverlay,
  dynamicDOMObserverService,
  elementHighlightService,
  scannerController,
  scannerClientService,
} from '@/features/element-scanner';

describe('Interactive Element Scanner & Shadow DOM Badges (Slice 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    // Mock getBoundingClientRect with positive dimensions for testing
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 50,
      left: 100,
      width: 120,
      height: 35,
      bottom: 85,
      right: 220,
    });
  });

  afterEach(() => {
    scannerController.stop();
    document.body.innerHTML = '';
  });

  describe('A. Interactive Element Detection', () => {
    it('detects standard buttons, inputs, links, textareas, and selects', () => {
      document.body.innerHTML = `
        <div>
          <button id="btn1">Submit Application</button>
          <a id="link1" href="https://example.com/about">About Us</a>
          <input id="input1" type="text" placeholder="Enter full name" />
          <textarea id="ta1" placeholder="Write feedback"></textarea>
          <select id="sel1">
            <option value="1">Option 1</option>
          </select>
        </div>
      `;

      const result = elementDetectorService.scanDocument(document);

      expect(result.success).toBe(true);
      expect(result.elements.length).toBe(5);

      const tags = result.elements.map((e) => e.tagName);
      expect(tags).toContain('button');
      expect(tags).toContain('a');
      expect(tags).toContain('input');
      expect(tags).toContain('textarea');
      expect(tags).toContain('select');
    });

    it('detects ARIA interactive roles', () => {
      document.body.innerHTML = `
        <div>
          <div role="button" tabindex="0">Custom ARIA Button</div>
          <span role="link" tabindex="0">Custom ARIA Link</span>
          <div role="checkbox" aria-checked="false">Remember Me</div>
          <div role="switch" aria-checked="true">Dark Mode</div>
          <div role="tab">Overview Tab</div>
        </div>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.length).toBe(5);

      const roles = result.elements.map((e) => e.role);
      expect(roles).toContain('button');
      expect(roles).toContain('link');
      expect(roles).toContain('checkbox');
      expect(roles).toContain('switch');
      expect(roles).toContain('tab');
    });

    it('detects custom clickable elements and contenteditable elements', () => {
      document.body.innerHTML = `
        <div onclick="console.log('clicked')">Clickable Div with handler</div>
        <div contenteditable="true">Editable Rich Note</div>
        <div tabindex="0">Keyboard Focusable Tile</div>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.length).toBe(3);
    });

    it('ignores non-interactive anchor tags without an href', () => {
      document.body.innerHTML = `
        <a id="nav-anchor">Section Bookmark Target</a>
        <a href="#top">Back to top</a>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].label).toBe('Back to top');
    });

    it('prevents duplicate child elements inside interactive parent buttons', () => {
      document.body.innerHTML = `
        <button id="save-btn">
          <span class="icon">💾</span>
          <span class="label">Save Changes</span>
        </button>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].tagName).toBe('button');
      expect(result.elements[0].label).toContain('Save Changes');
    });

    it('assigns incrementing stable session actionIds (1, 2, 3...)', () => {
      document.body.innerHTML = `
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.map((e) => e.actionId)).toEqual([1, 2, 3]);
    });
  });

  describe('B. Element Classification', () => {
    it('classifies navigation links and navbar elements as navigation', () => {
      document.body.innerHTML = `
        <nav>
          <a href="/home">Home</a>
          <a href="/docs">Documentation</a>
        </nav>
        <div class="pagination">
          <button class="nav-item">Next page</button>
        </div>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.every((e) => e.category === 'navigation')).toBe(true);
    });

    it('classifies primary action triggers (submit, save, confirm, cta)', () => {
      document.body.innerHTML = `
        <button type="submit">Submit Order</button>
        <button class="btn-primary">Buy Now</button>
        <input type="submit" value="Sign In" />
        <button>Save Preferences</button>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.every((e) => e.category === 'primary-action')).toBe(true);
    });

    it('classifies secondary actions (cancel, dismiss, reset, close)', () => {
      document.body.innerHTML = `
        <button>Cancel</button>
        <button aria-label="Close">X</button>
        <input type="reset" value="Reset Form" />
        <button class="btn-outline">Dismiss</button>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.every((e) => e.category === 'secondary-action')).toBe(true);
    });

    it('classifies search inputs and dedicated search boxes', () => {
      document.body.innerHTML = `
        <input type="search" placeholder="Search knowledgebase..." />
        <input name="q" placeholder="Google Search" />
        <div role="searchbox" tabindex="0">Find articles</div>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.every((e) => e.category === 'search-field')).toBe(true);
    });

    it('classifies media controls inside video/audio players', () => {
      document.body.innerHTML = `
        <div class="media-player">
          <button aria-label="Play video">Play</button>
          <button aria-label="Mute audio">Mute</button>
          <div role="slider" aria-label="Volume slider" tabindex="0"></div>
        </div>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.every((e) => e.category === 'media-control')).toBe(true);
    });

    it('classifies standard form inputs (text, email, selects, textareas)', () => {
      document.body.innerHTML = `
        <input type="email" placeholder="you@domain.com" />
        <textarea placeholder="Message body"></textarea>
        <select><option>Select city</option></select>
        <input type="checkbox" id="tos" />
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.every((e) => e.category === 'form-input')).toBe(true);
    });
  });

  describe('C. Accessible Label Extraction', () => {
    it('prioritizes aria-labelledby over aria-label and text', () => {
      document.body.innerHTML = `
        <span id="heading-id">Account Profile Details</span>
        <button aria-labelledby="heading-id" aria-label="Ignored Label">
          Button Inner Text
        </button>
      `;

      const btn = document.querySelector('button')!;
      const label = elementMetadataService.getAccessibleLabel(btn);
      expect(label).toBe('Account Profile Details');
    });

    it('uses aria-label when aria-labelledby is absent', () => {
      document.body.innerHTML = `
        <button aria-label="Close dialog">X</button>
      `;

      const btn = document.querySelector('button')!;
      const label = elementMetadataService.getAccessibleLabel(btn);
      expect(label).toBe('Close dialog');
    });

    it('resolves associated <label for="id"> for form controls', () => {
      document.body.innerHTML = `
        <label for="email-field">Your Email Address</label>
        <input id="email-field" type="email" />
      `;

      const input = document.querySelector('input')!;
      const label = elementMetadataService.getAccessibleLabel(input);
      expect(label).toBe('Your Email Address');
    });

    it('uses placeholder or title when explicit label is missing', () => {
      document.body.innerHTML = `
        <input type="text" placeholder="Enter coupon code" />
        <button title="Click for help">?</button>
      `;

      const input = document.querySelector('input')!;
      const btn = document.querySelector('button')!;

      expect(elementMetadataService.getAccessibleLabel(input)).toBe('Enter coupon code');
      expect(elementMetadataService.getAccessibleLabel(btn)).toBe('Click for help');
    });

    it('extracts alt text from inner images in icon buttons', () => {
      document.body.innerHTML = `
        <button>
          <img src="cart.png" alt="Shopping Cart" />
        </button>
      `;

      const btn = document.querySelector('button')!;
      expect(elementMetadataService.getAccessibleLabel(btn)).toBe('Shopping Cart');
    });

    it('never reads or stores password field values', () => {
      document.body.innerHTML = `
        <label for="pwd">Account Password</label>
        <input id="pwd" type="password" value="SuperSecretPassword123!" />
      `;

      const result = elementDetectorService.scanDocument(document);
      const scanned = result.elements[0];

      expect(scanned.type).toBe('password');
      expect(scanned.label).toBe('Account Password');
      // Verifying value is not collected anywhere on ScannedElement
      expect((scanned as unknown as Record<string, unknown>).value).toBeUndefined();
    });
  });

  describe('D. Visibility & Disabled State Filtering', () => {
    it('filters out elements with display: none or visibility: hidden', () => {
      document.body.innerHTML = `
        <button id="visible-btn">I am visible</button>
        <button id="hidden-btn-1" style="display: none;">Display None</button>
        <button id="hidden-btn-2" style="visibility: hidden;">Visibility Hidden</button>
        <button id="hidden-btn-3" hidden>Hidden Attribute</button>
        <button id="hidden-btn-4" aria-hidden="true">ARIA Hidden</button>
      `;

      // Mock getComputedStyle for style checks
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
        const style = (el as HTMLElement).style;
        return {
          display: style.display || 'block',
          visibility: style.visibility || 'visible',
          opacity: '1',
        } as CSSStyleDeclaration;
      });

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].elementId).toBe('visible-btn');
    });

    it('filters out input[type="hidden"]', () => {
      document.body.innerHTML = `
        <input type="hidden" name="csrf" value="token123" />
        <input type="text" placeholder="Visible field" />
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0].type).toBe('text');
    });

    it('detects disabled state via attribute and aria-disabled', () => {
      document.body.innerHTML = `
        <button id="b1" disabled>Disabled Button</button>
        <div id="b2" role="button" aria-disabled="true">Disabled ARIA</div>
        <button id="b3">Enabled Button</button>
      `;

      const result = elementDetectorService.scanDocument(document);
      expect(result.elements[0].isEnabled).toBe(false);
      expect(result.elements[1].isEnabled).toBe(false);
      expect(result.elements[2].isEnabled).toBe(true);
    });
  });

  describe('E. Shadow DOM Overlay & Badge System', () => {
    it('creates an isolated Shadow DOM host without modifying host page styles', () => {
      document.body.innerHTML = `
        <button id="btn-login">Login</button>
      `;

      const scanResult = elementDetectorService.scanDocument(document);
      scannerOverlay.renderOverlay(scanResult.elements, true);

      const host = document.getElementById('sahayak-element-scanner-overlay');
      expect(host).not.toBeNull();
      expect(host?.shadowRoot).not.toBeNull();

      // Shadow root must contain badges container and stylesheet
      const shadow = host?.shadowRoot;
      const badges = shadow?.querySelectorAll('.sahayak-badge');
      expect(badges?.length).toBe(1);
      expect(badges?.[0].textContent).toContain('1');
      expect(badges?.[0].textContent).toContain('ACTION');
    });

    it('positions badges over target elements and synchronizes coordinates', () => {
      document.body.innerHTML = `
        <button id="btn-test">Click Me</button>
      `;

      const scanResult = elementDetectorService.scanDocument(document);
      scannerOverlay.renderOverlay(scanResult.elements, true);

      const host = document.getElementById('sahayak-element-scanner-overlay');
      const badge = host?.shadowRoot?.querySelector('.sahayak-badge') as HTMLElement;

      expect(badge).not.toBeNull();
      // rect top: 50, left: 100 -> top: 50 - 9 = 41px, left: 100 - 3 = 97px
      expect(badge.style.top).toBe('41px');
      expect(badge.style.left).toBe('97px');
    });

    it('hides and shows badges when toggled', () => {
      document.body.innerHTML = `
        <button id="btn1">Action</button>
      `;

      const scanResult = elementDetectorService.scanDocument(document);
      scannerOverlay.renderOverlay(scanResult.elements, true);

      const host = document.getElementById('sahayak-element-scanner-overlay');
      const container = host?.shadowRoot?.querySelector('.sahayak-badges-wrapper') as HTMLElement;

      expect(container.style.display).toBe('block');

      scannerOverlay.setBadgesVisible(false);
      expect(container.style.display).toBe('none');

      scannerOverlay.setBadgesVisible(true);
      expect(container.style.display).toBe('block');
    });

    it('highlights target element with pulsing ring and scrolls into view', () => {
      document.body.innerHTML = `
        <button id="target-btn">Target</button>
      `;

      const scanResult = elementDetectorService.scanDocument(document);
      scannerOverlay.renderOverlay(scanResult.elements, true);

      const targetEl = document.getElementById('target-btn')!;
      const scrollSpy = vi.spyOn(targetEl, 'scrollIntoView');

      const success = elementHighlightService.highlight(1);
      expect(success).toBe(true);
      expect(scrollSpy).toHaveBeenCalled();

      const host = document.getElementById('sahayak-element-scanner-overlay');
      const ring = host?.shadowRoot?.querySelector('.sahayak-highlight-ring') as HTMLElement;
      expect(ring.style.display).toBe('block');

      const badge = host?.shadowRoot?.querySelector('.sahayak-badge');
      expect(badge?.classList.contains('sahayak-badge-active')).toBe(true);

      elementHighlightService.clear();
      expect(ring.style.display).toBe('none');
      expect(badge?.classList.contains('sahayak-badge-active')).toBe(false);
    });

    it('destroys overlay cleanly and removes listeners on stop', () => {
      document.body.innerHTML = `<button>Btn</button>`;
      const scanResult = elementDetectorService.scanDocument(document);
      scannerOverlay.renderOverlay(scanResult.elements, true);

      expect(document.getElementById('sahayak-element-scanner-overlay')).not.toBeNull();

      scannerOverlay.destroy();
      expect(document.getElementById('sahayak-element-scanner-overlay')).toBeNull();
    });
  });

  describe('F. Dynamic DOM MutationObserver & Infinite Loop Prevention', () => {
    it('debounces dynamic mutations and triggers update callback', async () => {
      document.body.innerHTML = `<div id="app"></div>`;
      const changeCallback = vi.fn();

      dynamicDOMObserverService.startObserving(changeCallback, document.body);

      // Dynamically add a button
      const newBtn = document.createElement('button');
      newBtn.textContent = 'Dynamic Button';
      document.getElementById('app')!.appendChild(newBtn);

      // Debounce timer is 350ms
      await new Promise((resolve) => setTimeout(resolve, 450));

      expect(changeCallback).toHaveBeenCalled();
      dynamicDOMObserverService.stopObserving();
    });

    it('strictly ignores mutations originating inside Sahayak overlay host', async () => {
      document.body.innerHTML = `<div id="app"></div>`;
      const changeCallback = vi.fn();

      dynamicDOMObserverService.startObserving(changeCallback, document.body);

      // Create overlay host and mutate it
      const host = document.createElement('div');
      host.id = 'sahayak-element-scanner-overlay';
      document.body.appendChild(host);

      const innerBadge = document.createElement('div');
      innerBadge.className = 'sahayak-badge';
      host.appendChild(innerBadge);

      await new Promise((resolve) => setTimeout(resolve, 400));

      // Callback must NOT have fired from overlay node additions
      expect(changeCallback).not.toHaveBeenCalled();
      dynamicDOMObserverService.stopObserving();
    });
  });

  describe('G. Scanner Controller & Client Integration', () => {
    it('executes full scan and returns structured summary via scannerController', () => {
      document.body.innerHTML = `
        <header>
          <a href="/">Logo Home</a>
          <input type="search" placeholder="Search..." />
        </header>
        <main>
          <button type="submit">Submit Form</button>
          <button>Cancel</button>
        </main>
      `;

      const result = scannerController.performScan(true);
      expect(result.success).toBe(true);
      expect(result.elements.length).toBe(4);
      expect(result.summary.totalCount).toBe(4);
      expect(result.summary.categories.navigation).toBe(1);
      expect(result.summary.categories['search-field']).toBe(1);
      expect(result.summary.categories['primary-action']).toBe(1);
      expect(result.summary.categories['secondary-action']).toBe(1);
    });

    it('rejects scanning on restricted browser protocol URLs', async () => {
      // Mock chrome.tabs.query returning chrome://extensions
      (chrome.tabs.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: 42,
          url: 'chrome://extensions',
        },
      ]);

      await expect(scannerClientService.scanActiveTab()).rejects.toThrow(
        /Chrome extensions cannot scan internal browser pages/
      );
    });

    it('stops scanner and resets state on stop command', () => {
      document.body.innerHTML = `<button>Click</button>`;
      scannerController.performScan(true);

      expect(elementDetectorService.getElementByActionId(1)).toBeDefined();

      scannerController.stop();
      expect(elementDetectorService.getElementByActionId(1)).toBeUndefined();
      expect(document.getElementById('sahayak-element-scanner-overlay')).toBeNull();
    });
  });
});
