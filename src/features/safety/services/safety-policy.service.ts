/**
 * Sahayak Centralized Safety Policy Engine (Slice 16)
 * Authoritative evaluation service that governs every proposed browser action.
 * Produces structured allow, approval-required, enhanced-confirmation, or blocked decisions.
 * Decision logic runs deterministically in TypeScript code; never delegated to AI.
 */

import { AgentAction } from '@/features/agent/types/agent.types';
import { ScannedElement } from '@/features/element-scanner';
import {
  SafetyPolicyDecision,
  SafetySettings,
  PolicyDecisionStatus,
  ConfirmationLevel,
  TargetMetadataSnapshot,
} from '../types/safety.types';
import { MANDATORY_BLOCKED_CATEGORIES } from '../rules/default-safety-rules';
import { actionRiskService } from './action-risk.service';
import { safetyAuditService } from './safety-audit.service';

export const SAFETY_SETTINGS_STORAGE_KEY = 'sahayak_safety_settings_v1';

export class SafetyPolicyService {
  private settings: SafetySettings = {
    enhancedConfirmationEnabled: true,
    strictUrlValidation: true,
    blockedCategories: [...MANDATORY_BLOCKED_CATEGORIES],
  };

  private isInitialized = false;

  public async getSettings(): Promise<SafetySettings> {
    await this.initSettings();
    return {
      ...this.settings,
      blockedCategories: [...MANDATORY_BLOCKED_CATEGORIES], // Always enforced
    };
  }

  public async updateSettings(
    updates: Partial<Pick<SafetySettings, 'enhancedConfirmationEnabled' | 'strictUrlValidation'>>
  ): Promise<SafetySettings> {
    await this.initSettings();
    this.settings = {
      ...this.settings,
      ...updates,
      blockedCategories: [...MANDATORY_BLOCKED_CATEGORIES], // Cannot be modified or weakened
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        await chrome.storage.local.set({ [SAFETY_SETTINGS_STORAGE_KEY]: this.settings });
      } catch (err) {
        console.warn('[Sahayak Safety] Failed to save safety settings:', err);
      }
    }

    return this.getSettings();
  }

  private async initSettings(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const res = await chrome.storage.local.get(SAFETY_SETTINGS_STORAGE_KEY);
        const stored = res
          ? (res as Record<string, unknown>)[SAFETY_SETTINGS_STORAGE_KEY]
          : undefined;
        if (stored && typeof stored === 'object') {
          const casted = stored as Partial<SafetySettings>;
          this.settings.enhancedConfirmationEnabled =
            casted.enhancedConfirmationEnabled !== undefined
              ? casted.enhancedConfirmationEnabled
              : true;
          this.settings.strictUrlValidation =
            casted.strictUrlValidation !== undefined ? casted.strictUrlValidation : true;
        }
      } catch {
        // Fall back to safe defaults
      }
    }
  }

  /**
   * Deterministically evaluates a proposed action against the safety rules.
   */
  public evaluateAction(
    action: AgentAction,
    element?: ScannedElement,
    _pageContext?: { url?: string; title?: string }
  ): SafetyPolicyDecision {
    const decisionId = `pol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const applicableRules: string[] = [];

    // 1. Recalculate Risk Deterministically (Never trust AI risk)
    const riskResult = actionRiskService.calculateRisk(action, element);
    const risk = riskResult.risk;

    let decision: PolicyDecisionStatus = 'approval_required';
    let requiredConfirmation: ConfirmationLevel = 'standard_approval';
    const reason = riskResult.reason;

    // Snapshot target metadata
    const targetMetadataSnapshot: TargetMetadataSnapshot = {
      actionId:
        'targetActionId' in action && typeof action.targetActionId === 'number'
          ? action.targetActionId
          : undefined,
      tagName: element?.tagName || ('targetTagName' in action ? action.targetTagName : undefined),
      label:
        element?.label || ('targetElementLabel' in action ? action.targetElementLabel : undefined),
      role: element?.role,
      isSubmitControl: element?.safetyMetadata?.isSubmitControl,
      isInsideForm: element?.safetyMetadata?.isInsideForm,
      formAction: element?.safetyMetadata?.formAction,
      formMethod: element?.safetyMetadata?.formMethod,
      href: element?.href || ('targetUrl' in action ? action.targetUrl : undefined),
    };

    // 2. Critical Risk -> Deterministic Block
    if (risk === 'critical' || riskResult.isConsequential) {
      decision = 'blocked';
      requiredConfirmation = 'none';
      applicableRules.push(
        riskResult.consequentialCategory === 'unsupported_url_schemes'
          ? 'RULE_BLOCK_UNSUPPORTED_URL_SCHEMES'
          : 'RULE_BLOCK_CONSEQUENTIAL_ACTION'
      );

      safetyAuditService
        .logEvent('action_blocked', { actionId: action.id, decisionId, risk, decision }, reason, {
          actionType: action.type,
          blockedCategory: riskResult.consequentialCategory,
          targetSnapshot: targetMetadataSnapshot,
        })
        .catch(() => {});

      return {
        decisionId,
        actionId: action.id,
        actionType: action.type,
        risk: 'critical',
        decision,
        reason,
        applicableRules,
        requiredConfirmation,
        isBlocked: true,
        blockedCategory:
          riskResult.consequentialCategory as import('../types/safety.types').BlockedActionCategory,
        evaluatedAt: Date.now(),
        targetMetadataSnapshot,
      };
    }

    // 3. High Risk -> Enhanced Confirmation
    if (risk === 'high' || riskResult.isAmbiguous) {
      applicableRules.push('RULE_ENHANCED_CONFIRMATION_AMBIGUOUS');
      if (this.settings.enhancedConfirmationEnabled) {
        decision = 'enhanced_confirmation_required';
        requiredConfirmation = 'enhanced_confirmation';
      } else {
        decision = 'approval_required';
        requiredConfirmation = 'standard_approval';
      }

      safetyAuditService
        .logEvent(
          'enhanced_confirmation_required',
          { actionId: action.id, decisionId, risk, decision },
          reason,
          { actionType: action.type, targetSnapshot: targetMetadataSnapshot }
        )
        .catch(() => {});

      return {
        decisionId,
        actionId: action.id,
        actionType: action.type,
        risk: 'high',
        decision,
        reason,
        applicableRules,
        requiredConfirmation,
        isBlocked: false,
        evaluatedAt: Date.now(),
        targetMetadataSnapshot,
      };
    }

    // 4. Low Risk -> Non-destructive visual
    if (risk === 'low') {
      decision = 'allowed';
      requiredConfirmation = 'standard_approval';
      applicableRules.push('RULE_ALLOW_VISUAL_ACTIONS');

      safetyAuditService
        .logEvent('action_allowed', { actionId: action.id, decisionId, risk, decision }, reason, {
          actionType: action.type,
        })
        .catch(() => {});

      return {
        decisionId,
        actionId: action.id,
        actionType: action.type,
        risk: 'low',
        decision,
        reason,
        applicableRules,
        requiredConfirmation,
        isBlocked: false,
        evaluatedAt: Date.now(),
        targetMetadataSnapshot,
      };
    }

    // 5. Medium Risk -> Standard Navigation & UI interaction
    decision = 'approval_required';
    requiredConfirmation = 'standard_approval';
    applicableRules.push('RULE_STANDARD_APPROVAL_NAVIGATION');

    safetyAuditService
      .logEvent('approval_required', { actionId: action.id, decisionId, risk, decision }, reason, {
        actionType: action.type,
        targetSnapshot: targetMetadataSnapshot,
      })
      .catch(() => {});

    return {
      decisionId,
      actionId: action.id,
      actionType: action.type,
      risk: 'medium',
      decision,
      reason,
      applicableRules,
      requiredConfirmation,
      isBlocked: false,
      evaluatedAt: Date.now(),
      targetMetadataSnapshot,
    };
  }
}

export const safetyPolicyService = new SafetyPolicyService();
