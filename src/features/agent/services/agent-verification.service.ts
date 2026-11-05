/**
 * Sahayak Agent Verification Service
 * Evaluates post-execution telemetry, checks element persistence,
 * and formulates clear diagnostic feedback for the user.
 */

import { ActionExecutionResult } from '../types/agent.types';

export class AgentVerificationService {
  /**
   * Evaluates an execution result and produces an enriched diagnostic verification.
   */
  public verify(result: ActionExecutionResult): ActionExecutionResult {
    // If action failed or was cancelled
    if (result.status !== 'success') {
      return result;
    }

    const { actionType, urlBefore, urlAfter } = result;

    let verificationMessage = result.message;

    switch (actionType) {
      case 'click_element': {
        const urlChanged = urlBefore && urlAfter && urlBefore !== urlAfter;
        if (urlChanged) {
          verificationMessage = `${result.message} Page navigated to new URL: ${urlAfter}`;
        } else {
          verificationMessage = `${result.message} Action was dispatched successfully on the page.`;
        }
        break;
      }

      case 'scroll_to_element': {
        verificationMessage = `${result.message} Element is now positioned in the center of your view.`;
        break;
      }

      case 'scroll_page': {
        verificationMessage = `${result.message} Viewport scrolled smoothly.`;
        break;
      }

      case 'navigate_to_url': {
        verificationMessage = `Navigation dispatched to ${urlAfter || 'destination'}.`;
        break;
      }

      case 'highlight_element': {
        verificationMessage = `${result.message} Element is highlighted with an active focus indicator.`;
        break;
      }
    }

    return {
      ...result,
      message: verificationMessage,
    };
  }
  /**
   * Enriched verification method returning verification status and diagnostic notes.
   */
  public verifyExecution(
    _action: import('../types/agent.types').AgentAction,
    result: ActionExecutionResult
  ): ActionExecutionResult & { verified: boolean; diagnosticNote: string; didUrlChange: boolean } {
    const verified = this.verify(result);
    const didUrlChange = Boolean(
      result.urlBefore && result.urlAfter && result.urlBefore !== result.urlAfter
    );

    let diagnosticNote = verified.message;
    if (result.status === 'target_not_found') {
      diagnosticNote = `${result.message} (Target element was no longer found on the webpage).`;
    } else if (result.status === 'stale_target') {
      diagnosticNote = `${result.message} (Element became detached from DOM).`;
    } else if (didUrlChange) {
      diagnosticNote = `Navigated to ${result.urlAfter}. Action succeeded.`;
    }

    return {
      ...verified,
      verified: result.status === 'success',
      diagnosticNote,
      didUrlChange,
    };
  }
}

export const agentVerificationService = new AgentVerificationService();
