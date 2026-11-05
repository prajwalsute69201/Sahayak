/**
 * Sahayak Shadow DOM Scanner Overlay & Badge System
 * Renders non-intrusive, isolated visual badges and highlight rings
 * directly above detected interactive elements without leaking styles.
 */

import { ScannedElement, CATEGORY_BADGE_CONFIGS } from '../types/element-scanner.types';
import { elementDetectorService } from '../services/element-detector.service';

export class ScannerOverlay {
  private hostElement: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private badgeContainer: HTMLDivElement | null = null;
  private highlightRing: HTMLDivElement | null = null;
  private badgesVisible: boolean = true;
  private activeHighlightedActionId: number | null = null;

  private isListeningToWindow: boolean = false;
  private rafId: number | null = null;

  private boundOnScrollOrResize = () => {
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.updateBadgePositions();
        this.updateHighlightPosition();
        this.rafId = null;
      });
    }
  };

  /**
   * Initializes or re-renders the Shadow DOM overlay with the given scanned elements.
   */
  public renderOverlay(elements: ScannedElement[], showBadges: boolean = true): void {
    this.badgesVisible = showBadges;
    this.ensureShadowHost();

    if (!this.badgeContainer || !this.shadowRoot) return;

    // Clear previous badges
    this.badgeContainer.innerHTML = '';

    for (const el of elements) {
      const badge = this.createBadgeElement(el);
      this.badgeContainer.appendChild(badge);
    }

    this.badgeContainer.style.display = this.badgesVisible ? 'block' : 'none';

    this.updateBadgePositions();
    this.attachWindowListeners();
  }

  /**
   * Displays or hides the visual badges.
   */
  public setBadgesVisible(visible: boolean): void {
    this.badgesVisible = visible;
    if (this.badgeContainer) {
      this.badgeContainer.style.display = visible ? 'block' : 'none';
      if (visible) {
        this.updateBadgePositions();
      }
    }
  }

  /**
   * Smoothly scrolls to and visually highlights the target element with a pulsing ring.
   */
  public highlightElement(actionId: number): boolean {
    const el = elementDetectorService.getElementByActionId(actionId);
    if (!el || !el.isConnected) {
      this.clearHighlight();
      return false;
    }

    this.activeHighlightedActionId = actionId;

    // Smooth scroll into view
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } catch {
      // Fallback for environments lacking scrollIntoView options
      el.scrollIntoView();
    }

    // Update active badge style
    if (this.badgeContainer) {
      const badges = this.badgeContainer.querySelectorAll('.sahayak-badge');
      badges.forEach((b) => {
        const id = Number(b.getAttribute('data-action-id'));
        if (id === actionId) {
          b.classList.add('sahayak-badge-active');
        } else {
          b.classList.remove('sahayak-badge-active');
        }
      });
    }

    // Position highlight ring
    this.updateHighlightPosition();

    return true;
  }

  /**
   * Clears active highlight ring and badge emphasis.
   */
  public clearHighlight(): void {
    this.activeHighlightedActionId = null;
    if (this.highlightRing) {
      this.highlightRing.style.display = 'none';
    }
    if (this.badgeContainer) {
      const badges = this.badgeContainer.querySelectorAll('.sahayak-badge-active');
      badges.forEach((b) => b.classList.remove('sahayak-badge-active'));
    }
  }

  /**
   * Synchronizes positions of all badges relative to document viewport coordinates.
   */
  public updateBadgePositions(): void {
    if (!this.badgeContainer || !this.badgesVisible) return;

    const badges = this.badgeContainer.querySelectorAll('.sahayak-badge');
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    badges.forEach((badgeEl) => {
      const actionId = Number(badgeEl.getAttribute('data-action-id'));
      const domEl = elementDetectorService.getElementByActionId(actionId);

      if (!domEl || !domEl.isConnected) {
        (badgeEl as HTMLElement).style.display = 'none';
        return;
      }

      const rect = domEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        (badgeEl as HTMLElement).style.display = 'none';
        return;
      }

      (badgeEl as HTMLElement).style.display = 'inline-flex';

      // Position: top-left corner of element, offset slightly above
      let top = rect.top + scrollY - 9;
      const left = Math.max(0, rect.left + scrollX - 3);

      // Clamp if scrolled off top edge
      if (top < scrollY) {
        top = rect.top + scrollY + 2;
      }

      (badgeEl as HTMLElement).style.top = `${Math.round(top)}px`;
      (badgeEl as HTMLElement).style.left = `${Math.round(left)}px`;
    });
  }

  /**
   * Synchronizes highlight ring coordinates around the selected element.
   */
  private updateHighlightPosition(): void {
    if (!this.highlightRing || this.activeHighlightedActionId === null) {
      if (this.highlightRing) this.highlightRing.style.display = 'none';
      return;
    }

    const el = elementDetectorService.getElementByActionId(this.activeHighlightedActionId);
    if (!el || !el.isConnected) {
      this.highlightRing.style.display = 'none';
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      this.highlightRing.style.display = 'none';
      return;
    }

    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const padding = 4;
    this.highlightRing.style.display = 'block';
    this.highlightRing.style.top = `${Math.round(rect.top + scrollY - padding)}px`;
    this.highlightRing.style.left = `${Math.round(rect.left + scrollX - padding)}px`;
    this.highlightRing.style.width = `${Math.round(rect.width + padding * 2)}px`;
    this.highlightRing.style.height = `${Math.round(rect.height + padding * 2)}px`;
  }

  /**
   * Creates a single badge DOM node for an element.
   */
  private createBadgeElement(el: ScannedElement): HTMLDivElement {
    const config = CATEGORY_BADGE_CONFIGS[el.category] || CATEGORY_BADGE_CONFIGS.other;

    const badge = document.createElement('div');
    badge.className = 'sahayak-badge';
    badge.setAttribute('data-action-id', String(el.actionId));
    badge.setAttribute('data-category', el.category);
    badge.style.backgroundColor = config.backgroundColor;
    badge.style.borderColor = config.borderColor;
    badge.style.color = config.textColor;

    badge.innerHTML = `
      <span class="sahayak-badge-id">${el.actionId}</span>
      <span class="sahayak-badge-sep">·</span>
      <span class="sahayak-badge-code">${config.shortCode}</span>
    `;

    return badge;
  }

  /**
   * Creates the isolated host element and attaches Shadow DOM root.
   */
  private ensureShadowHost(): void {
    if (this.hostElement && this.shadowRoot && this.hostElement.isConnected) {
      return;
    }

    const existingHost = document.getElementById('sahayak-element-scanner-overlay');
    if (existingHost) {
      existingHost.remove();
    }

    const host = document.createElement('div');
    host.id = 'sahayak-element-scanner-overlay';
    host.style.position = 'absolute';
    host.style.top = '0';
    host.style.left = '0';
    host.style.width = '100%';
    host.style.height = '100%';
    host.style.pointerEvents = 'none';
    host.style.zIndex = '2147483640';

    const shadow = host.attachShadow({ mode: 'open' });

    // Inject encapsulated styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        pointer-events: none !important;
      }
      .sahayak-overlay-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483642;
      }
      .sahayak-badge {
        position: absolute;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 2px 5px;
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        letter-spacing: 0.02em;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.2);
        pointer-events: none;
        user-select: none;
        z-index: 2147483646;
        transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s ease;
      }
      .sahayak-badge-id {
        font-weight: 800;
      }
      .sahayak-badge-sep {
        opacity: 0.7;
        font-size: 8px;
      }
      .sahayak-badge-code {
        font-size: 9px;
        letter-spacing: 0.04em;
        opacity: 0.95;
      }
      .sahayak-badge-active {
        transform: scale(1.22);
        box-shadow: 0 0 0 2px #ffffff, 0 0 12px rgba(37, 99, 235, 0.9);
        z-index: 2147483647;
      }
      .sahayak-highlight-ring {
        position: absolute;
        display: none;
        pointer-events: none;
        border: 2.5px solid #2563eb;
        border-radius: 6px;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.35), 0 0 18px rgba(37, 99, 235, 0.55);
        z-index: 2147483645;
        animation: sahayak-pulse-glow 1.8s infinite ease-in-out;
        transition: top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease;
      }
      @keyframes sahayak-pulse-glow {
        0%, 100% {
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.35), 0 0 18px rgba(37, 99, 235, 0.55);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.5), 0 0 28px rgba(37, 99, 235, 0.85);
        }
      }
    `;

    const container = document.createElement('div');
    container.className = 'sahayak-overlay-container';

    const highlightRing = document.createElement('div');
    highlightRing.className = 'sahayak-highlight-ring';
    container.appendChild(highlightRing);

    const badgeContainer = document.createElement('div');
    badgeContainer.className = 'sahayak-badges-wrapper';
    container.appendChild(badgeContainer);

    shadow.appendChild(style);
    shadow.appendChild(container);

    (document.body || document.documentElement).appendChild(host);

    this.hostElement = host;
    this.shadowRoot = shadow;
    this.badgeContainer = badgeContainer;
    this.highlightRing = highlightRing;
  }

  private attachWindowListeners(): void {
    if (this.isListeningToWindow) return;
    window.addEventListener('scroll', this.boundOnScrollOrResize, { passive: true });
    window.addEventListener('resize', this.boundOnScrollOrResize, { passive: true });
    this.isListeningToWindow = true;
  }

  private detachWindowListeners(): void {
    if (!this.isListeningToWindow) return;
    window.removeEventListener('scroll', this.boundOnScrollOrResize);
    window.removeEventListener('resize', this.boundOnScrollOrResize);
    this.isListeningToWindow = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Completely destroys the overlay, disconnects listeners, and removes host node.
   */
  public destroy(): void {
    this.detachWindowListeners();
    this.clearHighlight();

    if (this.hostElement && this.hostElement.isConnected) {
      this.hostElement.remove();
    }

    this.hostElement = null;
    this.shadowRoot = null;
    this.badgeContainer = null;
    this.highlightRing = null;
  }
}

export const scannerOverlay = new ScannerOverlay();
