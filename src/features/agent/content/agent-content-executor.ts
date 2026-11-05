/**
 * Sahayak Agent Content Script Action Executor
 * Safely dispatches approved single-step browser operations within the host page context.
 */

import { AgentAction, ActionExecutionResult, ActionExecutionStatus } from '../types/agent.types';
import { elementDetectorService } from '@/features/element-scanner';
import { elementHighlightService } from '@/features/element-scanner';

export class AgentContentExecutor {
  /**
   * Executes an approved action on the active page and captures execution metrics.
   */
  public async execute(action: AgentAction, approvalToken: string): Promise<ActionExecutionResult> {
    const startTime = performance.now();
    const urlBefore = window.location.href;

    // Security Gate 1: Check approval token
    if (!approvalToken || action.approvalStatus !== 'approved') {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'cancelled',
        message: 'Action execution aborted: missing or unverified approval token.',
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
        urlBefore,
      };
    }

    try {
      switch (action.type) {
        case 'click_element':
          return await this.executeClick(action, startTime, urlBefore);

        case 'scroll_to_element':
          return this.executeScrollToElement(action, startTime, urlBefore);

        case 'scroll_page':
          return this.executeScrollPage(action, startTime, urlBefore);

        case 'navigate_to_url':
          return this.executeNavigate(action, startTime, urlBefore);

        case 'highlight_element':
          return this.executeHighlight(action, startTime, urlBefore);

        default: {
          const unhandled = action as unknown as AgentAction;
          return {
            actionId: unhandled.id,
            actionType: unhandled.type,
            status: 'failed',
            message: `Unsupported action type: ${unhandled.type}`,
            dispatchedAt: Date.now(),
            durationMs: Math.round(performance.now() - startTime),
            urlBefore,
          };
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'failed',
        message: `Execution failed with error: ${msg}`,
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
        urlBefore,
        error: msg,
      };
    }
  }

  private async executeClick(
    action: Extract<AgentAction, { type: 'click_element' }>,
    startTime: number,
    urlBefore: string
  ): Promise<ActionExecutionResult> {
    const el = elementDetectorService.getElementByActionId(action.targetActionId);

    // Target validation
    if (!el) {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'target_not_found',
        message: `Target element #${action.targetActionId} could not be found in active document.`,
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
        urlBefore,
        targetAvailable: false,
      };
    }

    if (!el.isConnected) {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'stale_target',
        message: `Target element #${action.targetActionId} is no longer attached to document DOM.`,
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
        urlBefore,
        targetAvailable: false,
      };
    }

    // Scroll into view first so click coordinates and view are aligned
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } catch {
      el.scrollIntoView();
    }

    // Give 50ms for smooth scroll settling
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Focus if focusable
    if (typeof el.focus === 'function') {
      try {
        el.focus();
      } catch {
        // Ignore focus errors
      }
    }

    // Dispatch full mouse event sequence
    try {
      const mousedown = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      const mouseup = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window,
      });

      el.dispatchEvent(mousedown);
      el.dispatchEvent(mouseup);
      el.click();
    } catch {
      // Direct click fallback
      el.click();
    }

    const durationMs = Math.round(performance.now() - startTime);
    const urlAfter = window.location.href;

    return {
      actionId: action.id,
      actionType: action.type,
      status: 'success',
      message: `Successfully clicked <${el.tagName.toLowerCase()}> element #${action.targetActionId} ("${action.targetElementLabel || el.innerText?.slice(0, 30) || 'unlabeled'}").`,
      dispatchedAt: Date.now(),
      durationMs,
      urlBefore,
      urlAfter,
      targetAvailable: el.isConnected,
    };
  }

  private executeScrollToElement(
    action: Extract<AgentAction, { type: 'scroll_to_element' }>,
    startTime: number,
    urlBefore: string
  ): ActionExecutionResult {
    const el = elementDetectorService.getElementByActionId(action.targetActionId);

    if (!el) {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'target_not_found',
        message: `Target element #${action.targetActionId} not found in document.`,
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
        urlBefore,
        targetAvailable: false,
      };
    }

    if (!el.isConnected) {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'stale_target',
        message: `Target element #${action.targetActionId} is detached from DOM.`,
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
        urlBefore,
        targetAvailable: false,
      };
    }

    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } catch {
      el.scrollIntoView();
    }

    return {
      actionId: action.id,
      actionType: action.type,
      status: 'success',
      message: `Centered element #${action.targetActionId} in viewport.`,
      dispatchedAt: Date.now(),
      durationMs: Math.round(performance.now() - startTime),
      urlBefore,
      urlAfter: window.location.href,
      targetAvailable: true,
    };
  }

  private executeScrollPage(
    action: Extract<AgentAction, { type: 'scroll_page' }>,
    startTime: number,
    urlBefore: string
  ): ActionExecutionResult {
    const amount = action.amountPx || Math.round(window.innerHeight * 0.7);

    switch (action.direction) {
      case 'down':
        window.scrollBy({ top: amount, behavior: 'smooth' });
        break;
      case 'up':
        window.scrollBy({ top: -amount, behavior: 'smooth' });
        break;
      case 'top':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'bottom':
        window.scrollTo({
          top: document.body.scrollHeight || document.documentElement.scrollHeight,
          behavior: 'smooth',
        });
        break;
    }

    return {
      actionId: action.id,
      actionType: action.type,
      status: 'success',
      message: `Scrolled page ${action.direction} by ${amount}px.`,
      dispatchedAt: Date.now(),
      durationMs: Math.round(performance.now() - startTime),
      urlBefore,
      urlAfter: window.location.href,
    };
  }

  private executeNavigate(
    action: Extract<AgentAction, { type: 'navigate_to_url' }>,
    startTime: number,
    urlBefore: string
  ): ActionExecutionResult {
    const targetUrl = action.targetUrl;

    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          actionId: action.id,
          actionType: action.type,
          status: 'failed',
          message: `Blocked unsafe navigation protocol: ${parsed.protocol}`,
          dispatchedAt: Date.now(),
          durationMs: Math.round(performance.now() - startTime),
          urlBefore,
        };
      }

      window.location.href = targetUrl;

      return {
        actionId: action.id,
        actionType: action.type,
        status: 'success',
        message: `Navigated to ${targetUrl}`,
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
        urlBefore,
        urlAfter: targetUrl,
      };
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'failed',
        message: `Invalid navigation URL: ${err}`,
        dispatchedAt: Date.now(),
        durationMs: Math.round(performance.now() - startTime),
        urlBefore,
      };
    }
  }

  private executeHighlight(
    action: Extract<AgentAction, { type: 'highlight_element' }>,
    startTime: number,
    urlBefore: string
  ): ActionExecutionResult {
    const success = elementHighlightService.highlight(action.targetActionId);

    const status: ActionExecutionStatus = success ? 'success' : 'target_not_found';
    const message = success
      ? `Highlighted element #${action.targetActionId} with pulsing focus ring.`
      : `Target element #${action.targetActionId} not found to highlight.`;

    return {
      actionId: action.id,
      actionType: action.type,
      status,
      message,
      dispatchedAt: Date.now(),
      durationMs: Math.round(performance.now() - startTime),
      urlBefore,
      targetAvailable: success,
    };
  }
}

export const agentContentExecutor = new AgentContentExecutor();
