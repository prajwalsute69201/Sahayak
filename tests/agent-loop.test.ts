/**
 * Sahayak Slice 12 - Single-Step Agent Loop & HITL Approval UI Test Suite
 * Validates Zod schemas, AI & heuristic planners, single-use approval token security,
 * safe execution layer, verification diagnostics, and tab-isolated session management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clickElementActionSchema,
  scrollPageActionSchema,
  navigateToUrlActionSchema,
  rawAgentPlanResponseSchema,
} from '@/features/agent/schemas/agent-action.schema';
import { AgentPlannerService } from '@/features/agent/services/agent-planner.service';
import { AgentExecutorService } from '@/features/agent/services/agent-executor.service';
import { AgentVerificationService } from '@/features/agent/services/agent-verification.service';
import { AgentSessionService } from '@/features/agent/services/agent-session.service';
import { AgentOrchestratorService } from '@/features/agent/services/agent-orchestrator.service';
import { AgentContentExecutor } from '@/features/agent/content/agent-content-executor';
import {
  ScannedElement,
  elementDetectorService,
  elementHighlightService,
} from '@/features/element-scanner';
import { aiProviderManager } from '@/services/ai';
import { AgentAction, ActionExecutionResult } from '@/features/agent/types/agent.types';

describe('Slice 12: Single-Step Agent Loop & HITL Approval UI', () => {
  const mockCandidates: ScannedElement[] = [
    {
      actionId: 1,
      elementId: 'search-btn',
      tagName: 'button',
      type: 'submit',
      category: 'primary-action',
      label: 'Search',
      isVisible: true,
      isEnabled: true,
      rect: { top: 20, left: 100, width: 80, height: 35, bottom: 55, right: 180 },
      selector: 'button#search-btn',
    },
    {
      actionId: 2,
      elementId: 'login-link',
      tagName: 'a',
      category: 'navigation',
      label: 'Sign In',
      href: 'https://example.com/login',
      isVisible: true,
      isEnabled: true,
      rect: { top: 20, left: 200, width: 70, height: 30, bottom: 50, right: 270 },
      selector: 'a#login-link',
    },
    {
      actionId: 3,
      elementId: 'delete-account-btn',
      tagName: 'button',
      type: 'button',
      category: 'secondary-action',
      label: 'Delete Account Permanently',
      isVisible: true,
      isEnabled: true,
      rect: { top: 300, left: 50, width: 160, height: 40, bottom: 340, right: 210 },
      selector: 'button#delete-account-btn',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Section A: Zod Schema Validation & Security Constraints
  // =========================================================================
  describe('A. Action Schema Validation & Security Rules', () => {
    it('validates a correct click_element action proposal', () => {
      const valid = {
        type: 'click_element' as const,
        title: 'Click Search',
        description: 'Clicks the primary search button',
        reason: 'User asked to search',
        risk: 'low' as const,
        expectedResult: 'Triggers search query',
        targetActionId: 1,
        targetElementLabel: 'Search',
      };

      const result = clickElementActionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects click_element action with non-positive or negative targetActionId', () => {
      const invalid = {
        type: 'click_element',
        title: 'Click Search',
        description: 'Clicks the button',
        reason: 'Search',
        expectedResult: 'Search triggered',
        targetActionId: -5,
      };

      const result = clickElementActionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates scroll_page action with allowed directions', () => {
      const validScroll = {
        type: 'scroll_page' as const,
        title: 'Scroll Down',
        description: 'Scrolls viewport downwards by 500px',
        reason: 'Reveal lower page contents',
        expectedResult: 'Lower section becomes visible',
        direction: 'down' as const,
        amountPx: 500,
      };

      const result = scrollPageActionSchema.safeParse(validScroll);
      expect(result.success).toBe(true);
    });

    it('rejects scroll_page with invalid direction', () => {
      const invalidScroll = {
        type: 'scroll_page',
        title: 'Scroll Sideways',
        description: 'Scrolls sideways',
        reason: 'View left',
        expectedResult: 'Visible',
        direction: 'diagonal',
      };

      const result = scrollPageActionSchema.safeParse(invalidScroll);
      expect(result.success).toBe(false);
    });

    it('strictly enforces http: and https: protocols for navigate_to_url and rejects unsafe protocols', () => {
      const validHttp = navigateToUrlActionSchema.safeParse({
        type: 'navigate_to_url',
        title: 'Visit Docs',
        description: 'Opens documentation',
        reason: 'User request',
        expectedResult: 'Navigates to documentation',
        targetUrl: 'https://example.com/docs',
      });
      expect(validHttp.success).toBe(true);

      const invalidJs = navigateToUrlActionSchema.safeParse({
        type: 'navigate_to_url',
        title: 'Run Script',
        description: 'Dangerous script',
        reason: 'Malicious attempt',
        expectedResult: 'Executed',
        targetUrl: 'javascript:alert(document.cookie)',
      });
      expect(invalidJs.success).toBe(false);

      const invalidFile = navigateToUrlActionSchema.safeParse({
        type: 'navigate_to_url',
        title: 'Open File',
        description: 'File protocol',
        reason: 'Local file',
        expectedResult: 'Opened',
        targetUrl: 'file:///etc/passwd',
      });
      expect(invalidFile.success).toBe(false);
    });

    it('parses wrapped rawAgentPlanResponseSchema from AI provider', () => {
      const rawPayload = {
        action: {
          type: 'click_element',
          title: 'Click Search',
          description: 'Submits the search query',
          reason: 'Matches user query to search',
          risk: 'low',
          expectedResult: 'Form submitted',
          targetActionId: 1,
        },
        explanation: 'I selected the search button because you requested to search.',
      };

      const parsed = rawAgentPlanResponseSchema.safeParse(rawPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.action.type).toBe('click_element');
      }
    });
  });

  // =========================================================================
  // Section B: Agent Planner Service & Heuristic Fallback
  // =========================================================================
  describe('B. Agent Planner Service', () => {
    let planner: AgentPlannerService;

    beforeEach(() => {
      planner = new AgentPlannerService();
    });

    it('rejects empty or whitespace-only instruction', async () => {
      await expect(
        planner.planNextAction({
          instruction: '   ',
          candidates: mockCandidates,
          pageTitle: 'Example',
          pageUrl: 'https://example.com',
        })
      ).rejects.toThrow('User instruction cannot be empty.');
    });

    it('plans click action via AI provider when provider succeeds', async () => {
      vi.spyOn(aiProviderManager, 'generateText').mockResolvedValueOnce({
        text: JSON.stringify({
          action: {
            type: 'click_element',
            title: 'Click Search Button',
            description: 'Clicks element #1',
            reason: 'Matches search instruction',
            risk: 'low',
            expectedResult: 'Search executed',
            targetActionId: 1,
          },
          explanation: 'Targeting Search button',
        }),
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        usage: { promptTokens: 50, completionTokens: 40, totalTokens: 90 },
        latencyMs: 120,
      });

      const action = await planner.planNextAction({
        instruction: 'Click the search button',
        candidates: mockCandidates,
        pageTitle: 'Example',
        pageUrl: 'https://example.com',
      });

      expect(action.type).toBe('click_element');
      expect((action as Extract<AgentAction, { type: 'click_element' }>).targetActionId).toBe(1);
      expect(action.approvalStatus).toBe('pending');
      expect(action.id).toBeDefined();
    });

    it('automatically escalates risk and requires strong confirmation for destructive actions', async () => {
      vi.spyOn(aiProviderManager, 'generateText').mockResolvedValueOnce({
        text: JSON.stringify({
          action: {
            type: 'click_element',
            title: 'Click Delete Account',
            description: 'Deletes user account',
            reason: 'User requested account deletion',
            risk: 'low', // AI might underestimate risk
            expectedResult: 'Account deleted',
            targetActionId: 3,
          },
          explanation: 'Targeting delete button',
        }),
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        usage: { promptTokens: 50, completionTokens: 40, totalTokens: 90 },
        latencyMs: 120,
      });

      const action = await planner.planNextAction({
        instruction: 'Delete my account permanently',
        candidates: mockCandidates,
        pageTitle: 'Account Settings',
        pageUrl: 'https://example.com/settings',
      });

      expect(action.risk).toBe('high');
      expect(action.requiresStrongConfirmation).toBe(true);
    });

    it('falls back seamlessly to heuristic planner when AI provider throws an error', async () => {
      vi.spyOn(aiProviderManager, 'generateText').mockRejectedValueOnce(
        new Error('AI provider connection timeout')
      );

      const action = await planner.planNextAction({
        instruction: 'Click the Search button',
        candidates: mockCandidates,
        pageTitle: 'Example',
        pageUrl: 'https://example.com',
      });

      expect(action.type).toBe('click_element');
      expect((action as Extract<AgentAction, { type: 'click_element' }>).targetActionId).toBe(1);
      expect(action.approvalStatus).toBe('pending');
    });

    it('heuristic planner handles page scrolling instruction in English and Hinglish', async () => {
      // English scroll down
      const actionEn = planner.planWithHeuristics(
        'Scroll down a little bit',
        mockCandidates,
        'Test Page',
        'https://example.com'
      );
      expect(actionEn.type).toBe('scroll_page');
      expect((actionEn as Extract<AgentAction, { type: 'scroll_page' }>).direction).toBe('down');

      // Hinglish scroll down
      const actionHinglish = planner.planWithHeuristics(
        'Thoda neeche scroll karo',
        mockCandidates,
        'Test Page',
        'https://example.com'
      );
      expect(actionHinglish.type).toBe('scroll_page');
      expect((actionHinglish as Extract<AgentAction, { type: 'scroll_page' }>).direction).toBe(
        'down'
      );
    });

    it('heuristic planner handles element highlight instruction', async () => {
      const action = planner.planWithHeuristics(
        'Highlight the Sign In link',
        mockCandidates,
        'Test Page',
        'https://example.com'
      );
      expect(action.type).toBe('highlight_element');
      expect((action as Extract<AgentAction, { type: 'highlight_element' }>).targetActionId).toBe(
        2
      );
    });
  });

  // =========================================================================
  // Section C: Human-in-the-Loop Single-Use Token & Execution Guard
  // =========================================================================
  describe('C. Human-in-the-Loop Single-Use Approval Token & Execution Security', () => {
    let executor: AgentExecutorService;

    beforeEach(() => {
      executor = new AgentExecutorService();
    });

    it('blocks execution when action has not been approved', async () => {
      const unapprovedAction: AgentAction = {
        id: 'act-1',
        type: 'click_element',
        title: 'Click Search',
        description: 'Clicks search',
        reason: 'Search',
        risk: 'low',
        expectedResult: 'Search run',
        targetActionId: 1,
        approvalStatus: 'pending',
        createdAt: Date.now(),
      };

      const result = await executor.executeApprovedAction(unapprovedAction, 101);
      expect(result.status).toBe('cancelled');
      expect(result.message).toContain('Explicit user approval was not granted');
    });

    it('blocks execution when approvalToken is missing', async () => {
      const missingTokenAction: AgentAction = {
        id: 'act-2',
        type: 'click_element',
        title: 'Click Search',
        description: 'Clicks search',
        reason: 'Search',
        risk: 'low',
        expectedResult: 'Search run',
        targetActionId: 1,
        approvalStatus: 'approved',
        approvalToken: '', // empty token
        createdAt: Date.now(),
      };

      const result = await executor.executeApprovedAction(missingTokenAction, 101);
      expect(result.status).toBe('cancelled');
      expect(result.message).toContain('Explicit user approval was not granted');
    });

    it('consumes approval token and blocks duplicate execution attempt (replay protection)', async () => {
      const token = executor.generateApprovalToken();

      const approvedAction: AgentAction = {
        id: 'act-3',
        type: 'click_element',
        title: 'Click Search',
        description: 'Clicks search',
        reason: 'Search',
        risk: 'low',
        expectedResult: 'Search run',
        targetActionId: 1,
        approvalStatus: 'approved',
        approvalToken: token,
        createdAt: Date.now(),
      };

      // Mock successful chrome.tabs.sendMessage
      const mockSuccessResult: ActionExecutionResult = {
        actionId: 'act-3',
        actionType: 'click_element',
        status: 'success',
        message: 'Element clicked successfully',
        dispatchedAt: Date.now(),
        durationMs: 45,
        targetAvailable: true,
      };
      vi.mocked(chrome.tabs.sendMessage).mockResolvedValueOnce(mockSuccessResult);

      // First execution succeeds
      const firstResult = await executor.executeApprovedAction(approvedAction, 101);
      expect(firstResult.status).toBe('success');

      // Second execution attempt with identical token MUST fail
      const secondResult = await executor.executeApprovedAction(approvedAction, 101);
      expect(secondResult.status).toBe('failed');
      expect(secondResult.message).toContain('already been consumed');
    });
  });

  // =========================================================================
  // Section D: Content Script DOM Execution & Safety
  // =========================================================================
  describe('D. Content Script Safe DOM Execution', () => {
    let contentExecutor: AgentContentExecutor;

    beforeEach(() => {
      contentExecutor = new AgentContentExecutor();
      document.body.innerHTML = '';
    });

    it('returns target_not_found if target element does not exist in DOM', async () => {
      vi.spyOn(elementDetectorService, 'getElementByActionId').mockReturnValueOnce(undefined);

      const action: AgentAction = {
        id: 'act-10',
        type: 'click_element',
        title: 'Click Missing Element',
        description: 'Element missing',
        reason: 'Test',
        risk: 'low',
        expectedResult: 'None',
        targetActionId: 999,
        approvalStatus: 'approved',
        createdAt: Date.now(),
      };

      const result = await contentExecutor.execute(action, 'valid-token');
      expect(result.status).toBe('target_not_found');
      expect(result.targetAvailable).toBe(false);
    });

    it('returns stale_target if target element is disconnected from DOM tree', async () => {
      const detachedBtn = document.createElement('button');
      detachedBtn.textContent = 'Detached Button';
      // Note: detachedBtn is NOT appended to document.body, so isConnected === false

      vi.spyOn(elementDetectorService, 'getElementByActionId').mockReturnValueOnce(detachedBtn);

      const action: AgentAction = {
        id: 'act-11',
        type: 'click_element',
        title: 'Click Detached',
        description: 'Element detached',
        reason: 'Test',
        risk: 'low',
        expectedResult: 'None',
        targetActionId: 1,
        approvalStatus: 'approved',
        createdAt: Date.now(),
      };

      const result = await contentExecutor.execute(action, 'valid-token');
      expect(result.status).toBe('stale_target');
      expect(result.targetAvailable).toBe(false);
    });

    it('successfully clicks connected element and triggers mouse events', async () => {
      const realBtn = document.createElement('button');
      realBtn.id = 'target-btn';
      realBtn.textContent = 'Click Me';
      document.body.appendChild(realBtn);

      const clickSpy = vi.fn();
      realBtn.addEventListener('click', clickSpy);

      vi.spyOn(elementDetectorService, 'getElementByActionId').mockReturnValueOnce(realBtn);

      const action: AgentAction = {
        id: 'act-12',
        type: 'click_element',
        title: 'Click Connected',
        description: 'Clicks the real button',
        reason: 'User command',
        risk: 'low',
        expectedResult: 'Button clicked',
        targetActionId: 1,
        approvalStatus: 'approved',
        createdAt: Date.now(),
      };

      const result = await contentExecutor.execute(action, 'valid-token');
      expect(result.status).toBe('success');
      expect(result.targetAvailable).toBe(true);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('executes scroll_to_element by invoking scrollIntoView', async () => {
      const section = document.createElement('div');
      section.id = 'section-target';
      document.body.appendChild(section);

      const scrollSpy = vi.fn();
      section.scrollIntoView = scrollSpy;

      vi.spyOn(elementDetectorService, 'getElementByActionId').mockReturnValueOnce(section);

      const action: AgentAction = {
        id: 'act-13',
        type: 'scroll_to_element',
        title: 'Scroll to Section',
        description: 'Brings section into view',
        reason: 'View section',
        risk: 'low',
        expectedResult: 'Section visible',
        targetActionId: 2,
        approvalStatus: 'approved',
        createdAt: Date.now(),
      };

      const result = await contentExecutor.execute(action, 'valid-token');
      expect(result.status).toBe('success');
      expect(scrollSpy).toHaveBeenCalledTimes(1);
    });

    it('executes highlight_element by invoking elementHighlightService', async () => {
      const targetEl = document.createElement('input');
      document.body.appendChild(targetEl);

      const highlightSpy = vi.spyOn(elementHighlightService, 'highlight').mockReturnValue(true);

      const action: AgentAction = {
        id: 'act-14',
        type: 'highlight_element',
        title: 'Highlight Input',
        description: 'Highlights the input box',
        reason: 'Locate field',
        risk: 'low',
        expectedResult: 'Input highlighted',
        targetActionId: 2,
        approvalStatus: 'approved',
        createdAt: Date.now(),
      };

      const result = await contentExecutor.execute(action, 'valid-token');
      expect(result.status).toBe('success');
      expect(highlightSpy).toHaveBeenCalledWith(2);
    });
  });

  // =========================================================================
  // Section E: Action Verification & Telemetry Service
  // =========================================================================
  describe('E. Action Verification & Diagnostics', () => {
    let verification: AgentVerificationService;

    beforeEach(() => {
      verification = new AgentVerificationService();
    });

    it('generates successful verification summary with diagnostic feedback', () => {
      const action: AgentAction = {
        id: 'act-20',
        type: 'click_element',
        title: 'Click Search',
        description: 'Clicks search',
        reason: 'Search',
        risk: 'low',
        expectedResult: 'Search results displayed',
        targetActionId: 1,
        approvalStatus: 'approved',
        createdAt: Date.now(),
      };

      const execution: ActionExecutionResult = {
        actionId: 'act-20',
        actionType: 'click_element',
        status: 'success',
        message: 'Element clicked',
        dispatchedAt: Date.now(),
        durationMs: 38,
        targetAvailable: true,
      };

      const verified = verification.verifyExecution(action, execution);
      expect(verified.verified).toBe(true);
      expect(verified.durationMs).toBe(38);
      expect(verified.diagnosticNote).toContain('successfully');
    });

    it('detects URL change when action triggered navigation', () => {
      const action: AgentAction = {
        id: 'act-21',
        type: 'click_element',
        title: 'Click Sign In',
        description: 'Clicks login link',
        reason: 'Login',
        risk: 'low',
        expectedResult: 'Navigates to login',
        targetActionId: 2,
        approvalStatus: 'approved',
        createdAt: Date.now(),
      };

      const execution: ActionExecutionResult = {
        actionId: 'act-21',
        actionType: 'click_element',
        status: 'success',
        message: 'Link clicked',
        dispatchedAt: Date.now(),
        durationMs: 95,
        urlBefore: 'https://example.com/home',
        urlAfter: 'https://example.com/login',
        targetAvailable: true,
      };

      const verified = verification.verifyExecution(action, execution);
      expect(verified.didUrlChange).toBe(true);
      expect(verified.diagnosticNote).toContain('Navigated to https://example.com/login');
    });

    it('provides clear actionable failure diagnostic when target element was missing', () => {
      const action: AgentAction = {
        id: 'act-22',
        type: 'click_element',
        title: 'Click Submit',
        description: 'Clicks submit',
        reason: 'Submit',
        risk: 'low',
        expectedResult: 'Submitted',
        targetActionId: 5,
        approvalStatus: 'approved',
        createdAt: Date.now(),
      };

      const execution: ActionExecutionResult = {
        actionId: 'act-22',
        actionType: 'click_element',
        status: 'target_not_found',
        message: 'Element #5 not found',
        dispatchedAt: Date.now(),
        durationMs: 12,
        targetAvailable: false,
      };

      const verified = verification.verifyExecution(action, execution);
      expect(verified.verified).toBe(false);
      expect(verified.status).toBe('target_not_found');
      expect(verified.diagnosticNote).toContain('no longer found');
    });
  });

  // =========================================================================
  // Section F: Session Management & Tab Isolation
  // =========================================================================
  describe('F. Tab-Isolated Session Management', () => {
    let sessionService: AgentSessionService;

    beforeEach(() => {
      sessionService = new AgentSessionService();
    });

    it('isolates sessions between different browser tabs', () => {
      const session1 = sessionService.getOrCreateSession(101);
      const session2 = sessionService.getOrCreateSession(102);

      expect(session1.tabId).toBe(101);
      expect(session2.tabId).toBe(102);

      // State transition on tab 101 should not impact tab 102
      sessionService.transitionState(101, 'planning');
      expect(sessionService.getSession(101)?.state).toBe('planning');
      expect(sessionService.getSession(102)?.state).toBe('idle');
    });

    it('tracks executed action history in session', () => {
      sessionService.getOrCreateSession(101);

      const action: AgentAction = {
        id: 'act-30',
        type: 'scroll_page',
        title: 'Scroll Down',
        description: 'Scrolls page',
        reason: 'See lower page',
        risk: 'low',
        expectedResult: 'Scrolled',
        direction: 'down',
        approvalStatus: 'approved',
        createdAt: Date.now(),
      };

      const result: ActionExecutionResult = {
        actionId: 'act-30',
        actionType: 'scroll_page',
        status: 'success',
        message: 'Scrolled down',
        dispatchedAt: Date.now(),
        durationMs: 20,
      };

      sessionService.recordExecutedAction(101, action, result);
      const session = sessionService.getSession(101);
      expect(session?.executedActions.length).toBe(1);
      expect(session?.executedActions[0].id).toBe('act-30');
      expect(session?.state).toBe('completed');
    });

    it('resets session back to idle state', () => {
      sessionService.getOrCreateSession(101);
      sessionService.transitionState(101, 'executing');
      expect(sessionService.getSession(101)?.state).toBe('executing');

      sessionService.resetSession(101);
      expect(sessionService.getSession(101)?.state).toBe('idle');
      expect(sessionService.getSession(101)?.proposedAction).toBeNull();
    });
  });

  // =========================================================================
  // Section G: Orchestrator Integration Workflow
  // =========================================================================
  describe('G. Full Orchestrator Integration Cycle', () => {
    let orchestrator: AgentOrchestratorService;

    beforeEach(() => {
      orchestrator = new AgentOrchestratorService();
      vi.mocked(chrome.tabs.query).mockResolvedValue([
        {
          id: 101,
          url: 'https://example.com',
          title: 'Example Domain',
          favIconUrl: '',
        } as chrome.tabs.Tab,
      ]);
    });

    it('executes full HITL flow: Plan -> Propose -> User Rejects -> Cancelled', async () => {
      // 1. Plan
      const proposal = await orchestrator.planAction(
        'Scroll down to read more',
        mockCandidates,
        101
      );
      expect(proposal).toBeDefined();
      expect(proposal.type).toBe('scroll_page');

      const session = orchestrator.getCurrentSession(101);
      expect(session?.state).toBe('awaiting_approval');
      expect(session?.proposedAction).toBeDefined();

      // 2. Reject
      const rejectedAction = orchestrator.rejectAction(101, proposal.id);
      expect(rejectedAction.approvalStatus).toBe('rejected');

      const updatedSession = orchestrator.getCurrentSession(101);
      expect(updatedSession?.state).toBe('cancelled');
      expect(updatedSession?.proposedAction).toBeNull();
    });

    it('executes full HITL flow: Plan -> Propose -> User Approves -> Execute -> Complete', async () => {
      // 1. Plan
      const proposal = await orchestrator.planAction('Click Search', mockCandidates, 101);
      expect(proposal.type).toBe('click_element');

      // 2. Approve & Execute
      const mockResult: ActionExecutionResult = {
        actionId: proposal.id,
        actionType: 'click_element',
        status: 'success',
        message: 'Search clicked',
        dispatchedAt: Date.now(),
        durationMs: 32,
        targetAvailable: true,
      };
      vi.mocked(chrome.tabs.sendMessage).mockResolvedValueOnce(mockResult);

      const verified = await orchestrator.approveAndExecute(101, proposal.id);
      expect(verified.status).toBe('success');
      expect(verified.verified).toBe(true);

      const session = orchestrator.getCurrentSession(101);
      expect(session?.state).toBe('completed');
      expect(session?.executedActions.length).toBe(1);
    });
  });
});
