/**
 * Sahayak Slice 13 - Progress Persistence, Dry-Run Mode & Action Logs Test Suite
 * Validates session persistence across tab lifecycles, safe restoration without execution authority,
 * dry-run simulation guards in executor, structured lifecycle audit logging, and schema migration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentPersistenceService } from '@/features/agent/services/agent-persistence.service';
import { AgentActionLogService } from '@/features/agent/services/agent-action-log.service';
import { AgentMigrationService } from '@/features/agent/services/agent-migration.service';
import { AgentExecutorService } from '@/features/agent/services/agent-executor.service';
import { AgentOrchestratorService } from '@/features/agent/services/agent-orchestrator.service';
import { storageService } from '@/services/storage.service';
import { AgentAction, AgentSession } from '@/features/agent/types/agent.types';
import { ScannedElement } from '@/features/element-scanner';

describe('Slice 13: Progress Persistence, Dry-Run Mode & Action Logs', () => {
  let persistenceService: AgentPersistenceService;
  let actionLogService: AgentActionLogService;
  let migrationService: AgentMigrationService;
  let executorService: AgentExecutorService;
  let orchestratorService: AgentOrchestratorService;

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
      elementId: 'checkout-btn',
      tagName: 'button',
      type: 'button',
      category: 'primary-action',
      label: 'Proceed to Checkout',
      isVisible: true,
      isEnabled: true,
      rect: { top: 120, left: 100, width: 150, height: 40, bottom: 160, right: 250 },
      selector: 'button#checkout-btn',
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    await storageService.clear();

    persistenceService = new AgentPersistenceService();
    actionLogService = new AgentActionLogService(50); // limit to 50 for pruning tests
    migrationService = new AgentMigrationService();
    executorService = new AgentExecutorService();
    orchestratorService = new AgentOrchestratorService();
  });

  // =========================================================================
  // Section A: Progress Persistence & Safe Restoration
  // =========================================================================
  describe('A. Agent Progress Persistence & Safe Restoration', () => {
    it('persists and restores a completed session for the correct browser tab', async () => {
      const session: AgentSession = {
        version: 1,
        sessionId: 'sess-101',
        tabId: 101,
        userInstruction: 'Click the search button',
        state: 'completed',
        proposedAction: null,
        executedActions: [
          {
            id: 'act-1',
            type: 'click_element',
            title: 'Click Search',
            description: 'Clicked search',
            reason: 'User command',
            risk: 'low',
            expectedResult: 'Search results displayed',
            targetActionId: 1,
            approvalStatus: 'approved',
            createdAt: Date.now() - 5000,
          },
        ],
        actionResults: [
          {
            actionId: 'act-1',
            actionType: 'click_element',
            status: 'success',
            message: 'Search clicked',
            dispatchedAt: Date.now() - 4900,
            durationMs: 35,
          },
        ],
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 4800,
      };

      await persistenceService.saveSession(session);

      const restored = await persistenceService.loadSession(101);
      expect(restored).not.toBeNull();
      expect(restored?.sessionId).toBe('sess-101');
      expect(restored?.tabId).toBe(101);
      expect(restored?.executedActions.length).toBe(1);
      expect(restored?.actionResults.length).toBe(1);
      expect(restored?.isRestored).toBe(true);
    });

    it('isolates persisted sessions between different browser tabs', async () => {
      const sessionTab101: AgentSession = {
        version: 1,
        sessionId: 'sess-101',
        tabId: 101,
        userInstruction: 'Search query',
        state: 'completed',
        proposedAction: null,
        executedActions: [],
        actionResults: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const sessionTab102: AgentSession = {
        version: 1,
        sessionId: 'sess-102',
        tabId: 102,
        userInstruction: 'Scroll page',
        state: 'idle',
        proposedAction: null,
        executedActions: [],
        actionResults: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await persistenceService.saveSession(sessionTab101);
      await persistenceService.saveSession(sessionTab102);

      const loaded101 = await persistenceService.loadSession(101);
      const loaded102 = await persistenceService.loadSession(102);

      expect(loaded101?.sessionId).toBe('sess-101');
      expect(loaded102?.sessionId).toBe('sess-102');
    });

    it('safely marks pending actions as interrupted and invalidates approval authority on restore', async () => {
      // Simulate session that was awaiting approval or executing when browser crashed/closed
      const interruptedSession: AgentSession = {
        version: 1,
        sessionId: 'sess-interrupted',
        tabId: 201,
        userInstruction: 'Checkout cart',
        state: 'awaiting_approval',
        proposedAction: {
          id: 'act-checkout',
          type: 'click_element',
          title: 'Click Checkout',
          description: 'Checkout',
          reason: 'Checkout',
          risk: 'high',
          expectedResult: 'Checkout completed',
          targetActionId: 2,
          approvalStatus: 'approved', // had approval in old lifecycle
          approvalToken: 'old-stale-token-123',
          createdAt: Date.now() - 3000,
        },
        executedActions: [],
        actionResults: [],
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 3000,
      };

      await persistenceService.saveSession(interruptedSession);

      const restored = await persistenceService.loadSession(201);
      expect(restored).not.toBeNull();
      // Must be marked as interrupted
      expect(restored?.state).toBe('interrupted');
      expect(restored?.isInterrupted).toBe(true);
      expect(restored?.isRestored).toBe(true);

      // Must have erased approval authority
      expect(restored?.proposedAction?.approvalToken).toBeUndefined();
      expect(restored?.proposedAction?.approvalStatus).toBe('cancelled');
    });

    it('deletes session when tab is closed or reset', async () => {
      const session: AgentSession = {
        version: 1,
        sessionId: 'sess-to-delete',
        tabId: 301,
        userInstruction: 'Test',
        state: 'idle',
        proposedAction: null,
        executedActions: [],
        actionResults: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await persistenceService.saveSession(session);
      expect(await persistenceService.loadSession(301)).not.toBeNull();

      await persistenceService.deleteSession(301);
      expect(await persistenceService.loadSession(301)).toBeNull();
    });
  });

  // =========================================================================
  // Section B: Schema Migration & Corrupted Data Resilience
  // =========================================================================
  describe('B. Schema Migration & Data Resilience', () => {
    it('migrates legacy unversioned session and supplies version: 1', () => {
      const unversionedRaw = {
        sessionId: 'legacy-sess-1',
        tabId: 105,
        userInstruction: 'Legacy instruction',
        state: 'completed',
        executedActions: [],
        actionResults: [],
        createdAt: 1700000000000,
        updatedAt: 1700000001000,
      };

      const migrated = migrationService.migrateSession(unversionedRaw, 105);
      expect(migrated).not.toBeNull();
      expect(migrated?.version).toBe(1);
      expect(migrated?.sessionId).toBe('legacy-sess-1');
      expect(migrated?.isRestored).toBe(true);
    });

    it('returns null and recovers gracefully from completely corrupted non-object payload', () => {
      const corrupted = 'not a valid session JSON';
      const result = migrationService.migrateSession(corrupted, 101);
      expect(result).toBeNull();
    });

    it('filters out malformed log entries while preserving valid ones', () => {
      const rawLogs = [
        {
          id: 'valid-1',
          sessionId: 'sess-1',
          eventType: 'session_created',
          description: 'Session started',
          timestamp: Date.now(),
          isDryRun: false,
        },
        {
          // Missing id and eventType - malformed!
          description: 'Corrupted entry',
        },
        {
          id: 'valid-2',
          sessionId: 'sess-1',
          eventType: 'action_proposed',
          description: 'Proposed click',
          timestamp: Date.now(),
          isDryRun: true,
        },
      ];

      const validLogs = migrationService.migrateLogs(rawLogs);
      expect(validLogs.length).toBe(2);
      expect(validLogs[0].id).toBe('valid-1');
      expect(validLogs[1].id).toBe('valid-2');
    });
  });

  // =========================================================================
  // Section C: Dry-Run Mode Enforcement & Safety
  // =========================================================================
  describe('C. Dry-Run Mode Enforcement & Safety', () => {
    it('persists and retrieves Dry-Run Mode setting', async () => {
      expect(await persistenceService.getDryRunMode()).toBe(false);

      await persistenceService.setDryRunMode(true);
      expect(await persistenceService.getDryRunMode()).toBe(true);

      await persistenceService.setDryRunMode(false);
      expect(await persistenceService.getDryRunMode()).toBe(false);
    });

    it('CRITICAL SAFETY: strictly blocks browser execution in executor when Dry-Run is active', async () => {
      executorService.setDryRun(true);

      const actionToDryRun: AgentAction = {
        id: 'act-dry-1',
        type: 'click_element',
        title: 'Click Submit Form',
        description: 'Submit form action',
        reason: 'Submit',
        risk: 'high',
        expectedResult: 'Form submitted',
        targetActionId: 1,
        approvalStatus: 'approved',
        approvalToken: 'valid-token',
        createdAt: Date.now(),
      };

      const sendMessageSpy = vi.mocked(chrome.tabs.sendMessage);

      const result = await executorService.executeAction(actionToDryRun, 101);

      // Must be preview_only
      expect(result.status).toBe('preview_only');
      expect(result.isDryRun).toBe(true);
      expect(result.message).toContain('Dry-Run Preview');

      // CRITICAL: Must NEVER dispatch to content script
      expect(sendMessageSpy).not.toHaveBeenCalled();
    });

    it('intercepts execution if Dry-Run is enabled between planning and approval (race condition guard)', async () => {
      // Step 1: User plans action with dry-run initially FALSE
      executorService.setDryRun(false);

      const action: AgentAction = {
        id: 'act-race-1',
        type: 'click_element',
        title: 'Delete Data',
        description: 'Destructive action',
        reason: 'Delete',
        risk: 'high',
        expectedResult: 'Deleted',
        targetActionId: 1,
        approvalStatus: 'approved',
        approvalToken: 'token-abc',
        isDryRun: false, // planned as live action
        createdAt: Date.now(),
      };

      // Step 2: User enables Dry-Run Mode right before execution
      executorService.setDryRun(true);

      const sendMessageSpy = vi.mocked(chrome.tabs.sendMessage);
      const result = await executorService.executeAction(action, 101);

      // Executor central guard must catch it!
      expect(result.status).toBe('preview_only');
      expect(result.isDryRun).toBe(true);
      expect(sendMessageSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Section D: Structured Action Logging
  // =========================================================================
  describe('D. Structured Action Logging', () => {
    it('records lifecycle events with structured metadata', async () => {
      const entry = await actionLogService.logEvent({
        sessionId: 'sess-log-1',
        tabId: 101,
        eventType: 'instruction_received',
        description: 'User requested search',
        isDryRun: false,
        metadata: {
          userInstruction: 'Search for articles',
          pageUrl: 'https://example.com',
        },
      });

      expect(entry.id).toBeDefined();
      expect(entry.eventType).toBe('instruction_received');
      expect(entry.timestamp).toBeGreaterThan(0);

      const allLogs = await actionLogService.getLogs('all');
      expect(allLogs.length).toBe(1);
      expect(allLogs[0].sessionId).toBe('sess-log-1');
      expect(allLogs[0].metadata?.userInstruction).toBe('Search for articles');
    });

    it('correctly filters logs by category: success, dry_run, failed, rejected', async () => {
      await actionLogService.logEvent({
        sessionId: 'sess-1',
        eventType: 'execution_completed',
        description: 'Action succeeded',
        status: 'success',
        isDryRun: false,
      });

      await actionLogService.logEvent({
        sessionId: 'sess-1',
        eventType: 'action_previewed',
        description: 'Dry run preview',
        status: 'preview_only',
        isDryRun: true,
      });

      await actionLogService.logEvent({
        sessionId: 'sess-1',
        eventType: 'execution_failed',
        description: 'Element click failed',
        status: 'failed',
        isDryRun: false,
      });

      await actionLogService.logEvent({
        sessionId: 'sess-1',
        eventType: 'action_rejected',
        description: 'User rejected proposal',
        status: 'rejected',
        isDryRun: false,
      });

      const successLogs = await actionLogService.getLogs('success');
      expect(successLogs.length).toBe(1);
      expect(successLogs[0].status).toBe('success');

      const dryRunLogs = await actionLogService.getLogs('dry_run');
      expect(dryRunLogs.length).toBe(1);
      expect(dryRunLogs[0].isDryRun).toBe(true);

      const failedLogs = await actionLogService.getLogs('failed');
      expect(failedLogs.length).toBe(1);
      expect(failedLogs[0].status).toBe('failed');

      const rejectedLogs = await actionLogService.getLogs('rejected');
      expect(rejectedLogs.length).toBe(1);
      expect(rejectedLogs[0].status).toBe('rejected');
    });

    it('prunes oldest logs when exceeding maxEntries while retaining recent entries', async () => {
      // logger configured with max 50 entries
      for (let i = 1; i <= 60; i++) {
        await actionLogService.logEvent({
          sessionId: 'sess-prune',
          eventType: 'instruction_received',
          description: `Event #${i}`,
          isDryRun: false,
        });
      }

      const logs = await actionLogService.getLogs('all');
      expect(logs.length).toBe(50);
      // Newest (Event #60) should be at top
      expect(logs[0].description).toBe('Event #60');
      // Oldest retained should be Event #11 (1-10 pruned)
      expect(logs[logs.length - 1].description).toBe('Event #11');
    });

    it('clears logs safely without corrupting active sessions', async () => {
      // Create session and log entry
      const session: AgentSession = {
        version: 1,
        sessionId: 'sess-active',
        tabId: 101,
        userInstruction: 'Active task',
        state: 'idle',
        proposedAction: null,
        executedActions: [],
        actionResults: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await persistenceService.saveSession(session);

      await actionLogService.logEvent({
        sessionId: 'sess-active',
        eventType: 'instruction_received',
        description: 'Instruction',
        isDryRun: false,
      });
      expect(actionLogService.getCount()).toBe(1);

      // Clear logs
      await actionLogService.clearLogs();
      expect(actionLogService.getCount()).toBe(0);

      // Active session in persistence MUST still exist!
      const activeSession = await persistenceService.loadSession(101);
      expect(activeSession).not.toBeNull();
      expect(activeSession?.sessionId).toBe('sess-active');
    });
  });

  // =========================================================================
  // Section E: Full Orchestrator Integration Workflow (Slice 13)
  // =========================================================================
  describe('E. Full Orchestrator Integration: Dry-Run & Progress Persistence', () => {
    beforeEach(() => {
      vi.mocked(chrome.tabs.query).mockResolvedValue([
        {
          id: 101,
          url: 'https://example.com/checkout',
          title: 'Shopping Checkout',
          favIconUrl: '',
        } as chrome.tabs.Tab,
      ]);
    });

    it('runs entire Dry-Run cycle: Plan -> Propose -> Approve -> Simulated Preview -> Logged -> Persisted', async () => {
      // 1. Enable Dry-Run
      await orchestratorService.setDryRun(true, 101);
      expect(orchestratorService.isDryRun()).toBe(true);

      // 2. Plan action
      const proposal = await orchestratorService.planAction('Click Checkout', mockCandidates, 101);
      expect(proposal.isDryRun).toBe(true);

      // 3. User Approves preview
      const result = await orchestratorService.approveAndExecute(101, proposal.id);
      expect(result.status).toBe('preview_only');
      expect(result.isDryRun).toBe(true);

      // 4. Check action logs recorded action_previewed
      const dryRunLogs = await actionLogService.getLogs('dry_run');
      expect(dryRunLogs.length).toBeGreaterThan(0);
      expect(dryRunLogs.some((l) => l.eventType === 'action_previewed')).toBe(true);

      // 5. Check session was persisted to storage
      const persisted = await persistenceService.loadSession(101);
      expect(persisted).not.toBeNull();
      expect(persisted?.state).toBe('completed');
      expect(persisted?.executedActions.length).toBe(1);
    });

    it('restores interrupted session without executing and allows user to start a fresh plan', async () => {
      // Simulate crash: session in executing state
      const crashedSession: AgentSession = {
        version: 1,
        sessionId: 'crashed-session',
        tabId: 101,
        userInstruction: 'Submit order',
        state: 'executing',
        proposedAction: {
          id: 'act-order',
          type: 'click_element',
          title: 'Submit Order',
          description: 'Submits payment',
          reason: 'Order',
          risk: 'high',
          expectedResult: 'Order placed',
          targetActionId: 2,
          approvalStatus: 'approved',
          approvalToken: 'stale-token-xyz',
          createdAt: Date.now() - 5000,
        },
        executedActions: [],
        actionResults: [],
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 5000,
      };
      await persistenceService.saveSession(crashedSession);

      // User reopens Side Panel
      const restored = await orchestratorService.restoreSession(
        101,
        'https://example.com/checkout'
      );
      expect(restored.state).toBe('interrupted');
      expect(restored.isInterrupted).toBe(true);

      // Stale approval token removed
      expect(restored.proposedAction?.approvalToken).toBeUndefined();

      // Action log should record action_interrupted and session_restored
      const allLogs = await actionLogService.getLogs('all');
      expect(allLogs.some((l) => l.eventType === 'action_interrupted')).toBe(true);
      expect(allLogs.some((l) => l.eventType === 'session_restored')).toBe(true);
    });
  });
});
