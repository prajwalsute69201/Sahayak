/**
 * Sahayak Dynamic DOM Mutation Observer Service
 * Watches for DOM additions, removals, and interactive attribute alterations,
 * triggering debounced rescans while strictly preventing infinite loops from overlay nodes.
 */

export type DOMChangeCallback = () => void;

export class DynamicDOMObserverService {
  private observer: MutationObserver | null = null;
  private changeCallback: DOMChangeCallback | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_DELAY_MS = 350;

  /**
   * Starts observing document mutations.
   */
  public startObserving(callback: DOMChangeCallback, targetNode: Node = document.body): void {
    this.stopObserving();
    this.changeCallback = callback;

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    try {
      this.observer.observe(targetNode || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'hidden', 'style', 'class', 'aria-disabled', 'aria-hidden'],
      });
    } catch (e) {
      console.warn('[Sahayak Scanner] Failed to attach MutationObserver:', e);
    }
  }

  /**
   * Stops observing and cancels pending debounced callbacks.
   */
  public stopObserving(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.changeCallback = null;
  }

  /**
   * Evaluates mutations, filtering out Sahayak's own overlay host and shadow DOM.
   */
  private handleMutations(mutations: MutationRecord[]): void {
    let hasRelevantChanges = false;

    for (const mutation of mutations) {
      const target = mutation.target as HTMLElement | null;

      // Ignore mutations originating inside Sahayak overlay host
      if (
        target &&
        (target.id === 'sahayak-element-scanner-overlay' ||
          target.closest?.('#sahayak-element-scanner-overlay'))
      ) {
        continue;
      }

      // Check added nodes
      if (mutation.type === 'childList') {
        const isFromOverlay = (nodes: NodeList) => {
          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i] as HTMLElement;
            if (node.id === 'sahayak-element-scanner-overlay') return true;
          }
          return false;
        };

        if (isFromOverlay(mutation.addedNodes) || isFromOverlay(mutation.removedNodes)) {
          continue;
        }

        hasRelevantChanges = true;
        break;
      }

      // Attribute change on relevant elements
      if (mutation.type === 'attributes') {
        hasRelevantChanges = true;
        break;
      }
    }

    if (hasRelevantChanges && this.changeCallback) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        if (this.changeCallback) {
          this.changeCallback();
        }
      }, this.DEBOUNCE_DELAY_MS);
    }
  }
}

export const dynamicDOMObserverService = new DynamicDOMObserverService();
