/**
 * Sahayak Action Risk Classification Service (Slice 16)
 * Deterministically calculates risk levels ('low', 'medium', 'high', 'critical')
 * using application code, DOM metadata, and contextual signals.
 * Strictly ignores and recalculates any risk level claimed by the AI model.
 */

import { AgentAction } from '@/features/agent/types/agent.types';
import { ScannedElement } from '@/features/element-scanner';
import { SafetyRiskLevel } from '../types/safety.types';
import { consequentialActionService } from './consequential-action.service';
import { urlSafetyService } from './url-safety.service';

export interface ActionRiskCalculationResult {
  risk: SafetyRiskLevel;
  isConsequential: boolean;
  consequentialCategory?: string;
  reason: string;
  isAmbiguous: boolean;
}

export class ActionRiskService {
  /**
   * Recalculates the action risk deterministically.
   */
  public calculateRisk(action: AgentAction, element?: ScannedElement): ActionRiskCalculationResult {
    // 1. Non-destructive visual actions -> LOW risk
    if (
      action.type === 'highlight_element' ||
      action.type === 'scroll_to_element' ||
      action.type === 'scroll_page'
    ) {
      return {
        risk: 'low',
        isConsequential: false,
        reason:
          'Visual or viewport navigation action with zero destructive or state-changing effects.',
        isAmbiguous: false,
      };
    }

    // 2. Navigation Actions -> Validate URL
    if (action.type === 'navigate_to_url') {
      const urlCheck = urlSafetyService.validateUrl(action.targetUrl);
      if (!urlCheck.isValid) {
        return {
          risk: 'critical',
          isConsequential: true,
          consequentialCategory: 'unsupported_url_schemes',
          reason: urlCheck.reason || 'Navigation target URL fails protocol security checks.',
          isAmbiguous: false,
        };
      }
      return {
        risk: 'medium',
        isConsequential: false,
        reason: `Standard browser navigation to validated web destination: ${action.targetUrl}.`,
        isAmbiguous: false,
      };
    }

    // 3. Click Element -> Check Consequential Gating
    const consequential = consequentialActionService.evaluateConsequentialAction(action, element);
    if (consequential.isConsequential) {
      return {
        risk: 'critical',
        isConsequential: true,
        consequentialCategory: consequential.category,
        reason: consequential.reason || 'Action matches a consequential operation pattern.',
        isAmbiguous: false,
      };
    }

    // 4. Click Element -> Check for Ambiguous or Untrusted Targets
    if (action.type === 'click_element') {
      const isAmbiguous = this.isClickAmbiguous(action, element);
      if (isAmbiguous) {
        return {
          risk: 'high',
          isConsequential: false,
          reason:
            'Target element lacks clear accessible text or has ambiguous metadata. Enhanced confirmation required.',
          isAmbiguous: true,
        };
      }

      // Check if target is an ordinary anchor/link with safe URL
      if (element?.tagName === 'a' || element?.category === 'navigation') {
        if (element.href) {
          const urlCheck = urlSafetyService.validateUrl(element.href);
          if (!urlCheck.isValid) {
            return {
              risk: 'critical',
              isConsequential: true,
              consequentialCategory: 'unsupported_url_schemes',
              reason: `Link targets unsafe destination: ${urlCheck.reason}`,
              isAmbiguous: false,
            };
          }
        }
        return {
          risk: 'medium',
          isConsequential: false,
          reason: 'Ordinary navigation link interaction.',
          isAmbiguous: false,
        };
      }

      // Ordinary button / clickable element with clear label
      return {
        risk: 'medium',
        isConsequential: false,
        reason: 'Standard UI control interaction with verified accessible metadata.',
        isAmbiguous: false,
      };
    }

    // Fallback conservative treatment
    return {
      risk: 'high',
      isConsequential: false,
      reason: 'Unknown or unclassified action type treated conservatively as high risk.',
      isAmbiguous: true,
    };
  }

  /**
   * Identifies if a click action has ambiguous, generic, or incomplete target metadata
   */
  private isClickAmbiguous(action: AgentAction, element?: ScannedElement): boolean {
    const candidateLabel =
      element?.label ||
      ('targetElementLabel' in action && action.targetElementLabel
        ? action.targetElementLabel
        : '') ||
      action.title ||
      '';

    const label = candidateLabel.trim().toLowerCase();

    // Empty or generic fallback labels
    if (!label || label === 'interactive element' || label === 'button' || label === 'link') {
      return true;
    }

    // Generic clickbait or meaningless labels
    const genericLabels = [
      'click here',
      'click',
      'here',
      'more info',
      'learn more',
      'tap here',
      'click target',
    ];
    if (genericLabels.includes(label)) {
      return true;
    }

    if (element) {
      // Div or span with click listener but no ARIA role or accessible text
      if (
        (element.tagName === 'div' || element.tagName === 'span') &&
        !element.role &&
        label.length < 3
      ) {
        return true;
      }
    }

    return false;
  }
}

export const actionRiskService = new ActionRiskService();
