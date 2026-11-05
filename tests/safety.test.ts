/**
 * Slice 16: Deterministic Safety Rails & Consequential Gating Test Suite
 * Comprehensive verification of:
 * - Deterministic Risk Classification (ignoring AI claims)
 * - English & Romanized Hinglish Consequential Action Detection
 * - Strict URL Protocol Allowlisting & Credential Filtering
 * - Centralized Safety Policy Engine Decisions
 * - Deterministic Execution Guard & Replay Prevention
 * - HITL Integration & Enhanced Confirmation Gating
 * - Reusable Skills Safety Gating
 * - Zero-Sensitive-Leakage Audit Logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SafetyRiskLevel, PolicyDecisionStatus } from '../src/features/safety/types/safety.types';
import {
  safetyRiskLevelSchema,
  policyDecisionStatusSchema,
  safetyPolicyDecisionSchema,
} from '../src/features/safety/schemas/safety-policy.schema';
import {
  DEFAULT_SAFETY_RULES,
  MANDATORY_BLOCKED_CATEGORIES,
} from '../src/features/safety/rules/default-safety-rules';
import { urlSafetyService } from '../src/features/safety/services/url-safety.service';
import { consequentialActionService } from '../src/features/safety/services/consequential-action.service';
import { actionRiskService } from '../src/features/safety/services/action-risk.service';
import { safetyPolicyService } from '../src/features/safety/services/safety-policy.service';
import { executionGuardService } from '../src/features/safety/services/execution-guard.service';
import { safetyAuditService } from '../src/features/safety/services/safety-audit.service';
import {
  ClickElementAction,
  NavigateToUrlAction,
  ScrollPageAction,
} from '../src/features/agent/types/agent.types';
import { ScannedElement } from '../src/features/element-scanner';
import { agentOrchestratorService } from '../src/features/agent/services/agent-orchestrator.service';

// Mock external services called during orchestrator tests
vi.mock('@/features/element-scanner/services/scanner-client.service', () => ({
  scannerClientService: {
    scanActiveTab: vi.fn().mockResolvedValue({ success: true, elements: [] }),
    highlightElement: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/features/agent/services/agent-planner.service', () => ({
  agentPlannerService: {
    planNextAction: vi.fn(),
  },
}));

describe('Slice 16: Deterministic Safety Rails & Consequential Gating', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    executionGuardService.resetRegistry();
    await safetyAuditService.clearAuditEvents();
    await chrome.storage.local.remove([
      'sahayak_safety_settings_v1',
      'sahayak_safety_audit_logs_v1',
    ]);
  });

  /* -------------------------------------------------------------------------- */
  /* A. Schema & Policy Model Validation                                        */
  /* -------------------------------------------------------------------------- */
  describe('A. Schema & Policy Model Validation', () => {
    it('validates supported risk levels and decision statuses', () => {
      const validRisks: SafetyRiskLevel[] = ['low', 'medium', 'high', 'critical'];
      for (const r of validRisks) {
        expect(safetyRiskLevelSchema.safeParse(r).success).toBe(true);
      }
      expect(safetyRiskLevelSchema.safeParse('ultra_hazardous').success).toBe(false);

      const validDecisions: PolicyDecisionStatus[] = [
        'allowed',
        'approval_required',
        'enhanced_confirmation_required',
        'blocked',
      ];
      for (const d of validDecisions) {
        expect(policyDecisionStatusSchema.safeParse(d).success).toBe(true);
      }
      expect(policyDecisionStatusSchema.safeParse('permitted_without_check').success).toBe(false);
    });

    it('validates a complete well-formed SafetyPolicyDecision record', () => {
      const decision = {
        decisionId: 'pol_12345',
        actionId: 'act_101',
        actionType: 'click_element' as const,
        risk: 'critical' as const,
        decision: 'blocked' as const,
        reason: 'Automated form submission is blocked.',
        applicableRules: ['RULE_BLOCK_FORM_SUBMISSION'],
        requiredConfirmation: 'none' as const,
        isBlocked: true,
        blockedCategory: 'form_submission' as const,
        evaluatedAt: Date.now(),
        targetMetadataSnapshot: {
          actionId: 10,
          tagName: 'button',
          label: 'Submit Order',
          isSubmitControl: true,
          isInsideForm: true,
        },
      };

      const result = safetyPolicyDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });

    it('declares all mandatory blocked categories as immutable defaults', () => {
      expect(MANDATORY_BLOCKED_CATEGORIES).toContain('form_submission');
      expect(MANDATORY_BLOCKED_CATEGORIES).toContain('payments_and_purchases');
      expect(MANDATORY_BLOCKED_CATEGORIES).toContain('financial_transfers');
      expect(MANDATORY_BLOCKED_CATEGORIES).toContain('messaging_and_emails');
      expect(MANDATORY_BLOCKED_CATEGORIES).toContain('publishing_content');
      expect(MANDATORY_BLOCKED_CATEGORIES).toContain('destructive_operations');
      expect(MANDATORY_BLOCKED_CATEGORIES).toContain('security_account_changes');
      expect(MANDATORY_BLOCKED_CATEGORIES).toContain('unsupported_url_schemes');
      expect(MANDATORY_BLOCKED_CATEGORIES).toContain('sensitive_field_interaction');

      const mandatoryRules = DEFAULT_SAFETY_RULES.filter((r) => r.isMandatory);
      expect(mandatoryRules.length).toBeGreaterThanOrEqual(9);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* B. URL and Navigation Safety                                               */
  /* -------------------------------------------------------------------------- */
  describe('B. URL and Navigation Safety', () => {
    it('permits valid HTTP and HTTPS web URLs', () => {
      const resHttps = urlSafetyService.validateUrl('https://example.com/checkout/terms');
      expect(resHttps.isValid).toBe(true);
      expect(resHttps.scheme).toBe('https:');

      const resHttp = urlSafetyService.validateUrl('http://localhost:3000/dashboard');
      expect(resHttp.isValid).toBe(true);
      expect(resHttp.scheme).toBe('http:');
    });

    it('blocks dangerous and malicious URL schemes', () => {
      const dangerousUrls = [
        'javascript:alert("hacked")',
        'javascript:void(0)',
        'data:text/html,<script>alert(1)</script>',
        'file:///C:/Windows/System32/cmd.exe',
        'chrome://settings',
        'chrome-extension://malicious-id/popup.html',
        'edge://flags',
        'about:blank',
        'blob:https://example.com/uuid',
        'vbscript:msgbox("test")',
      ];

      for (const url of dangerousUrls) {
        const result = urlSafetyService.validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.reason).toMatch(/blocked|unsupported url protocol/i);
      }
    });

    it('blocks URLs with embedded credentials to prevent credential leaks', () => {
      const embeddedCredentialUrl = 'https://admin:superSecret123@secure-portal.com/login';
      const result = urlSafetyService.validateUrl(embeddedCredentialUrl);

      expect(result.isValid).toBe(false);
      expect(result.reason).toMatch(/embedded user credentials/i);
    });

    it('rejects empty, missing, or malformed URLs', () => {
      expect(urlSafetyService.validateUrl('').isValid).toBe(false);
      expect(urlSafetyService.validateUrl(null).isValid).toBe(false);
      expect(urlSafetyService.validateUrl(undefined).isValid).toBe(false);
      expect(urlSafetyService.validateUrl('not-a-valid-url').isValid).toBe(false);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* C. Consequential Action Gating (English & Hinglish)                        */
  /* -------------------------------------------------------------------------- */
  describe('C. Consequential Action Gating (English & Hinglish)', () => {
    const createBaseClick = (title: string, description: string): ClickElementAction => ({
      id: 'act_test',
      type: 'click_element',
      title,
      description,
      reason: 'User test step',
      risk: 'low', // Even if AI claimed low risk!
      expectedResult: 'Proceed',
      approvalStatus: 'pending',
      targetActionId: 1,
      createdAt: Date.now(),
    });

    it('detects and blocks form submission controls (HTML & ARIA)', () => {
      const action = createBaseClick('Click Submit', 'Click the submit button');
      const submitElement: ScannedElement = {
        actionId: 1,
        tagName: 'button',
        type: 'submit',
        category: 'primary-action',
        label: 'Submit Application',
        isVisible: true,
        isEnabled: true,
        rect: { top: 0, left: 0, width: 100, height: 40, bottom: 40, right: 100 },
        safetyMetadata: {
          isInsideForm: true,
          isSubmitControl: true,
          isDestructive: false,
          isPasswordOrSensitiveField: false,
        },
      };

      const detection = consequentialActionService.evaluateConsequentialAction(
        action,
        submitElement
      );
      expect(detection.isConsequential).toBe(true);
      expect(detection.category).toBe('form_submission');
      expect(detection.ruleId).toBe('RULE_BLOCK_FORM_SUBMISSION');
    });

    it('detects and blocks payments and checkout in English', () => {
      const paymentPhrases = [
        'Pay $49.00 now',
        'Proceed to Checkout',
        'Buy Now with 1-Click',
        'Place Your Order',
        'Confirm Razorpay Payment',
        'Pay with Stripe',
        'Submit PayPal purchase',
      ];

      for (const phrase of paymentPhrases) {
        const action = createBaseClick(phrase, `Action to ${phrase}`);
        const detection = consequentialActionService.evaluateConsequentialAction(action);
        expect(detection.isConsequential).toBe(true);
        expect(detection.category).toBe('payments_and_purchases');
      }
    });

    it('detects and blocks payments and purchases in Romanized Hinglish', () => {
      const hinglishPaymentPhrases = [
        'Abhi paise do',
        'Khareedo aur confirm karo',
        'Bhugtan karo Razorpay se',
        'Order place karo',
        'Is item ki kharidari karo',
      ];

      for (const phrase of hinglishPaymentPhrases) {
        const action = createBaseClick(phrase, phrase);
        const detection = consequentialActionService.evaluateConsequentialAction(action);
        expect(detection.isConsequential).toBe(true);
        expect(detection.category).toBe('payments_and_purchases');
      }
    });

    it('detects and blocks financial transfers in English & Hinglish', () => {
      const transferPhrases = [
        'Transfer funds to account',
        'Wire transfer $500',
        'Send money to vendor',
        'Withdraw balance to bank',
        // Hinglish
        'Bank me paise bhejo',
        'Amount transfer karo',
      ];

      for (const phrase of transferPhrases) {
        const action = createBaseClick(phrase, phrase);
        const detection = consequentialActionService.evaluateConsequentialAction(action);
        expect(detection.isConsequential).toBe(true);
        expect(detection.category).toBe('financial_transfers');
      }
    });

    it('detects and blocks outbound messaging and content publishing', () => {
      const messagingPhrases = [
        'Send email to team',
        'Send direct message to user',
        'Publish article to public blog',
        'Post comment on thread',
        // Hinglish
        'Mail bhejo sabko',
        'Post karo public wall pe',
      ];

      for (const phrase of messagingPhrases) {
        const action = createBaseClick(phrase, phrase);
        const detection = consequentialActionService.evaluateConsequentialAction(action);
        expect(detection.isConsequential).toBe(true);
        expect(['messaging_and_emails', 'publishing_content']).toContain(detection.category);
      }
    });

    it('detects and blocks destructive operations in English & Hinglish', () => {
      const destructivePhrases = [
        'Delete user account',
        'Remove account permanently',
        'Wipe organization data',
        'Terminate profile and purge all',
        // Hinglish
        'Account delete kar do',
        'Profile hata do permanently',
        'Sab data mita do',
      ];

      for (const phrase of destructivePhrases) {
        const action = createBaseClick(phrase, phrase);
        const detection = consequentialActionService.evaluateConsequentialAction(action);
        expect(detection.isConsequential).toBe(true);
        expect(detection.category).toBe('destructive_operations');
      }
    });

    it('detects and blocks security and credential changes in English & Hinglish', () => {
      const securityPhrases = [
        'Change password',
        'Reset user password',
        'Update MFA settings',
        'Disable two-factor authentication',
        // Hinglish
        'Mera password badlo',
        'Security settings change karo',
      ];

      for (const phrase of securityPhrases) {
        const action = createBaseClick(phrase, phrase);
        const detection = consequentialActionService.evaluateConsequentialAction(action);
        expect(detection.isConsequential).toBe(true);
        expect(detection.category).toBe('security_account_changes');
      }
    });

    it('strictly blocks targeting sensitive fields (password, OTP, CVV)', () => {
      const action = createBaseClick('Enter Pin', 'Type into password field');
      const passwordElement: ScannedElement = {
        actionId: 5,
        tagName: 'input',
        type: 'password',
        category: 'form-input',
        label: 'Password',
        isVisible: true,
        isEnabled: true,
        rect: { top: 0, left: 0, width: 100, height: 30, bottom: 30, right: 100 },
        safetyMetadata: {
          isInsideForm: true,
          isSubmitControl: false,
          isDestructive: false,
          isPasswordOrSensitiveField: true,
        },
      };

      const detection = consequentialActionService.evaluateConsequentialAction(
        action,
        passwordElement
      );
      expect(detection.isConsequential).toBe(true);
      expect(detection.category).toBe('sensitive_field_interaction');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* D. Action Risk Recalculation (Never Trust AI Claims)                       */
  /* -------------------------------------------------------------------------- */
  describe('D. Action Risk Recalculation (Never Trust AI Claims)', () => {
    it('classifies visual actions as low risk', () => {
      const scrollAction: ScrollPageAction = {
        id: 'act_scroll',
        type: 'scroll_page',
        title: 'Scroll Down',
        description: 'Scroll viewport down 500px',
        reason: 'Read more content',
        risk: 'high', // AI falsely claimed high risk
        expectedResult: 'Scrolled down',
        approvalStatus: 'pending',
        direction: 'down',
        amountPx: 500,
        createdAt: Date.now(),
      };

      const result = actionRiskService.calculateRisk(scrollAction);
      expect(result.risk).toBe('low');
      expect(result.isConsequential).toBe(false);
    });

    it('overrides false low risk from AI when targeting a consequential action', () => {
      const deceptiveAction: ClickElementAction = {
        id: 'act_buy',
        type: 'click_element',
        title: 'Harmless Button',
        description: 'Just clicking a button',
        reason: 'Safe step',
        risk: 'low', // AI falsely claimed LOW risk for a payment trigger!
        expectedResult: 'Clicked',
        approvalStatus: 'pending',
        targetActionId: 42,
        targetElementLabel: 'Confirm Payment of $199',
        createdAt: Date.now(),
      };

      const result = actionRiskService.calculateRisk(deceptiveAction);
      expect(result.risk).toBe('critical');
      expect(result.isConsequential).toBe(true);
      expect(result.consequentialCategory).toBe('payments_and_purchases');
    });

    it('classifies ambiguous or unlabelled targets as high risk requiring enhanced confirmation', () => {
      const ambiguousAction: ClickElementAction = {
        id: 'act_ambiguous',
        type: 'click_element',
        title: 'Click target',
        description: 'Click the unlabelled element',
        reason: 'Next step',
        risk: 'low',
        expectedResult: 'Element clicked',
        approvalStatus: 'pending',
        targetActionId: 99,
        createdAt: Date.now(),
      };

      const unlabelledElement: ScannedElement = {
        actionId: 99,
        tagName: 'div',
        category: 'other',
        label: 'Click here', // Generic ambiguous label
        isVisible: true,
        isEnabled: true,
        rect: { top: 0, left: 0, width: 20, height: 20, bottom: 20, right: 20 },
      };

      const result = actionRiskService.calculateRisk(ambiguousAction, unlabelledElement);
      expect(result.risk).toBe('high');
      expect(result.isAmbiguous).toBe(true);
    });

    it('classifies ordinary navigation links as medium risk', () => {
      const navAction: ClickElementAction = {
        id: 'act_nav',
        type: 'click_element',
        title: 'Read Documentation',
        description: 'Navigate to docs article',
        reason: 'Find details',
        risk: 'low',
        expectedResult: 'Docs page opened',
        approvalStatus: 'pending',
        targetActionId: 10,
        targetElementLabel: 'Documentation Overview',
        createdAt: Date.now(),
      };

      const linkElement: ScannedElement = {
        actionId: 10,
        tagName: 'a',
        category: 'navigation',
        label: 'Documentation Overview',
        href: 'https://developer.chrome.com/docs',
        isVisible: true,
        isEnabled: true,
        rect: { top: 0, left: 0, width: 120, height: 24, bottom: 24, right: 120 },
      };

      const result = actionRiskService.calculateRisk(navAction, linkElement);
      expect(result.risk).toBe('medium');
      expect(result.isConsequential).toBe(false);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* E. Centralized Safety Policy Engine                                        */
  /* -------------------------------------------------------------------------- */
  describe('E. Centralized Safety Policy Engine', () => {
    it('produces a blocked decision for critical operations with zero approval controls', () => {
      const payAction: ClickElementAction = {
        id: 'act_pay_1',
        type: 'click_element',
        title: 'Complete Checkout',
        description: 'Click place order button',
        reason: 'Finalize cart',
        risk: 'low',
        expectedResult: 'Order placed',
        approvalStatus: 'pending',
        targetActionId: 1,
        targetElementLabel: 'Place Order Now',
        createdAt: Date.now(),
      };

      const decision = safetyPolicyService.evaluateAction(payAction);
      expect(decision.decision).toBe('blocked');
      expect(decision.isBlocked).toBe(true);
      expect(decision.risk).toBe('critical');
      expect(decision.requiredConfirmation).toBe('none');
      expect(decision.reason).toMatch(/financial purchases|order/i);
    });

    it('requires enhanced confirmation for ambiguous high-risk operations', () => {
      const ambiguousAction: ClickElementAction = {
        id: 'act_amb_1',
        type: 'click_element',
        title: 'Click generic element',
        description: 'Click the element',
        reason: 'Step',
        risk: 'low',
        expectedResult: 'Clicked',
        approvalStatus: 'pending',
        targetActionId: 77,
        createdAt: Date.now(),
      };

      const genericElement: ScannedElement = {
        actionId: 77,
        tagName: 'button',
        category: 'other',
        label: 'Tap here',
        isVisible: true,
        isEnabled: true,
        rect: { top: 0, left: 0, width: 40, height: 40, bottom: 40, right: 40 },
      };

      const decision = safetyPolicyService.evaluateAction(ambiguousAction, genericElement);
      expect(decision.decision).toBe('enhanced_confirmation_required');
      expect(decision.requiredConfirmation).toBe('enhanced_confirmation');
      expect(decision.isBlocked).toBe(false);
      expect(decision.risk).toBe('high');
    });

    it('blocks navigation actions targeting disallowed protocols', () => {
      const jsNavAction: NavigateToUrlAction = {
        id: 'act_nav_js',
        type: 'navigate_to_url',
        title: 'Navigate to script',
        description: 'Run JS in address bar',
        reason: 'Test exploit',
        risk: 'low',
        expectedResult: 'Executed',
        approvalStatus: 'pending',
        targetUrl: 'javascript:alert(document.cookie)',
        createdAt: Date.now(),
      };

      const decision = safetyPolicyService.evaluateAction(jsNavAction);
      expect(decision.decision).toBe('blocked');
      expect(decision.isBlocked).toBe(true);
      expect(decision.blockedCategory).toBe('unsupported_url_schemes');
    });

    it('prevents user settings from modifying or disabling mandatory safety rules', async () => {
      const settings = await safetyPolicyService.getSettings();
      expect(settings.blockedCategories).toEqual(MANDATORY_BLOCKED_CATEGORIES);

      // Attempt to weaken settings
      const updated = await safetyPolicyService.updateSettings({
        enhancedConfirmationEnabled: false,
      });

      // Mandatory blocked categories MUST remain unchanged
      expect(updated.blockedCategories).toEqual(MANDATORY_BLOCKED_CATEGORIES);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* F. Deterministic Pre-Execution Guard                                       */
  /* -------------------------------------------------------------------------- */
  describe('F. Deterministic Pre-Execution Guard', () => {
    it('fails closed when attempting to execute a blocked action', () => {
      const blockedAction: ClickElementAction = {
        id: 'act_blocked_exec',
        type: 'click_element',
        title: 'Submit Tax Form',
        description: 'Submit form data to server',
        reason: 'File return',
        risk: 'critical',
        expectedResult: 'Submitted',
        approvalStatus: 'approved',
        approvalToken: 'token_123',
        targetActionId: 10,
        createdAt: Date.now(),
      };

      const submitElement: ScannedElement = {
        actionId: 10,
        tagName: 'button',
        type: 'submit',
        category: 'primary-action',
        label: 'Submit Return',
        isVisible: true,
        isEnabled: true,
        rect: { top: 0, left: 0, width: 80, height: 32, bottom: 32, right: 80 },
        safetyMetadata: {
          isInsideForm: true,
          isSubmitControl: true,
          isDestructive: false,
          isPasswordOrSensitiveField: false,
        },
      };

      const guardCheck = executionGuardService.verifyExecutionGuard({
        action: blockedAction,
        currentElement: submitElement,
        isDryRun: false,
      });

      expect(guardCheck.canExecute).toBe(false);
      expect(guardCheck.decision.isBlocked).toBe(true);
      expect(guardCheck.reason).toMatch(/Execution Guard Blocked/i);
    });

    it('prevents duplicate action execution (replay attack prevention)', () => {
      const action: ClickElementAction = {
        id: 'act_unique_101',
        type: 'click_element',
        title: 'Click Next Page',
        description: 'Navigate to page 2',
        reason: 'Next page',
        risk: 'medium',
        expectedResult: 'Page 2 loaded',
        approvalStatus: 'approved',
        approvalToken: 'token_fresh_abc',
        targetActionId: 5,
        createdAt: Date.now(),
      };

      // First check passes
      const firstCheck = executionGuardService.verifyExecutionGuard({
        action,
        isDryRun: false,
      });
      expect(firstCheck.canExecute).toBe(true);

      // Record as executed
      executionGuardService.recordExecuted(action.id);

      // Replay attempt fails immediately
      const replayCheck = executionGuardService.verifyExecutionGuard({
        action,
        isDryRun: false,
      });
      expect(replayCheck.canExecute).toBe(false);
      expect(replayCheck.reason).toMatch(/has already been executed\. Replay is forbidden/i);
    });

    it('fails closed when target element has dynamically mutated into a submit control', () => {
      const action: ClickElementAction = {
        id: 'act_mutated_element',
        type: 'click_element',
        title: 'Click button',
        description: 'Click button',
        reason: 'Step',
        risk: 'medium',
        expectedResult: 'Clicked',
        approvalStatus: 'approved',
        approvalToken: 'token_mut_1',
        targetActionId: 30,
        createdAt: Date.now(),
      };

      // Element was previously safe, but mutated in the DOM into a submit control!
      const mutatedElement: ScannedElement = {
        actionId: 30,
        tagName: 'button',
        category: 'primary-action',
        label: 'Submit Changes',
        isVisible: true,
        isEnabled: true,
        rect: { top: 0, left: 0, width: 80, height: 32, bottom: 32, right: 80 },
        safetyMetadata: {
          isInsideForm: true,
          isSubmitControl: true, // Mutated!
          isDestructive: false,
          isPasswordOrSensitiveField: false,
        },
      };

      const guardCheck = executionGuardService.verifyExecutionGuard({
        action,
        currentElement: mutatedElement,
        isDryRun: false,
      });

      expect(guardCheck.canExecute).toBe(false);
      expect(guardCheck.decision.isBlocked).toBe(true);
      expect(guardCheck.reason).toMatch(/Execution Guard Blocked/i);
    });

    it('rejects execution when approval token or status is missing', () => {
      const unapprovedAction: ClickElementAction = {
        id: 'act_unapproved',
        type: 'click_element',
        title: 'Click without approval',
        description: 'Click',
        reason: 'Step',
        risk: 'medium',
        expectedResult: 'Done',
        approvalStatus: 'pending', // Not approved!
        targetActionId: 2,
        createdAt: Date.now(),
      };

      const guardCheck = executionGuardService.verifyExecutionGuard({
        action: unapprovedAction,
        isDryRun: false,
      });

      expect(guardCheck.canExecute).toBe(false);
      expect(guardCheck.reason).toMatch(/lacks explicit user approval/i);
    });

    it('permits Dry-Run preview simulation even on elevated risk operations', () => {
      const highRiskAction: ClickElementAction = {
        id: 'act_dry_run_test',
        type: 'click_element',
        title: 'Click ambiguous button',
        description: 'Simulate click',
        reason: 'Preview',
        risk: 'high',
        expectedResult: 'Previewed',
        approvalStatus: 'preview_only',
        targetActionId: 3,
        isDryRun: true,
        createdAt: Date.now(),
      };

      const guardCheck = executionGuardService.verifyExecutionGuard({
        action: highRiskAction,
        isDryRun: true,
      });

      expect(guardCheck.canExecute).toBe(true);
      expect(guardCheck.isDryRun).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* G. Integration with Agent Orchestrator & HITL Approval                     */
  /* -------------------------------------------------------------------------- */
  describe('G. Integration with Agent Orchestrator & HITL Approval', () => {
    it('integrates policy evaluation during agent action planning', async () => {
      const candidates: ScannedElement[] = [
        {
          actionId: 1,
          tagName: 'button',
          category: 'primary-action',
          label: 'Submit Application',
          type: 'submit',
          isVisible: true,
          isEnabled: true,
          rect: { top: 0, left: 0, width: 100, height: 40, bottom: 40, right: 100 },
          safetyMetadata: {
            isInsideForm: true,
            isSubmitControl: true,
            isDestructive: false,
            isPasswordOrSensitiveField: false,
          },
        },
      ];

      // Planner attempts to propose clicking submit button
      const mockAction: ClickElementAction = {
        id: 'action_plan_submit',
        type: 'click_element',
        title: 'Submit Application',
        description: 'Click submit button',
        reason: 'Finish application',
        risk: 'low', // AI claimed low risk!
        expectedResult: 'Form submitted',
        approvalStatus: 'pending',
        targetActionId: 1,
        createdAt: Date.now(),
      };

      const { agentPlannerService } =
        await import('@/features/agent/services/agent-planner.service');
      vi.mocked(agentPlannerService.planNextAction).mockResolvedValue(mockAction);

      const planned = await agentOrchestratorService.planAction({
        instruction: 'Submit the application for me',
        candidates,
        pageTitle: 'Job Application',
        pageUrl: 'https://example.com/apply',
      });

      // Code overrides AI risk to 'critical' based on deterministic policy
      expect(planned.risk).toBe('critical');

      // Attempting to approve and execute the blocked action via orchestrator throws an error!
      await expect(agentOrchestratorService.approveAndExecute(1, planned.id)).rejects.toThrow(
        /Execution Guard Blocked/i
      );
    });
  });

  /* -------------------------------------------------------------------------- */
  /* H. Safety Audit Logging                                                    */
  /* -------------------------------------------------------------------------- */
  describe('H. Safety Audit Logging', () => {
    it('records safety audit events without leaking sensitive credentials', async () => {
      const testDecision = {
        decisionId: 'pol_audit_1',
        actionId: 'act_audit_1',
        risk: 'critical' as const,
        decision: 'blocked' as const,
      };

      const event = await safetyAuditService.logEvent(
        'action_blocked',
        testDecision,
        'Blocked payment trigger',
        {
          url: 'https://example.com/checkout',
          targetText: 'Pay Now $50',
          // Ensure zero passwords or tokens
        }
      );

      expect(event.eventId).toBeDefined();
      expect(event.eventType).toBe('action_blocked');

      const logs = await safetyAuditService.getAuditEvents();
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].decisionId).toBe('pol_audit_1');

      // Verify zero sensitive keywords in persisted log
      const serialized = JSON.stringify(logs);
      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('apiKey');
      expect(serialized).not.toContain('cvv');
    });
  });
});
