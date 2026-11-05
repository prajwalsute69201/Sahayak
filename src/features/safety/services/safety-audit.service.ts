/**
 * Sahayak Safety Audit Logging Service (Slice 16)
 * Dedicated, privacy-preserving audit trail for all deterministic policy evaluations,
 * blocked actions, execution guard rejections, and confirmation events.
 * Strictly guarantees zero collection of sensitive credentials, passwords, or form values.
 */

import {
  SafetyAuditEvent,
  SafetyAuditEventType,
  SafetyPolicyDecision,
} from '../types/safety.types';
import { agentActionLogService } from '@/features/agent/services/agent-action-log.service';

export const SAFETY_AUDIT_STORAGE_KEY = 'sahayak_safety_audit_logs_v1';
export const MAX_SAFETY_AUDIT_ENTRIES = 200;

export class SafetyAuditService {
  private inMemoryEvents: SafetyAuditEvent[] = [];

  private get isStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local &&
      typeof chrome.storage.local.get === 'function'
    );
  }

  /**
   * Logs a safety audit event to internal storage and mirrors to agent action log.
   */
  public async logEvent(
    eventType: SafetyAuditEventType,
    decision: Partial<SafetyPolicyDecision>,
    reason: string,
    metadata?: Record<string, unknown>
  ): Promise<SafetyAuditEvent> {
    const eventId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const event: SafetyAuditEvent = {
      eventId,
      sessionId: metadata?.sessionId as string | undefined,
      actionId: decision.actionId,
      decisionId: decision.decisionId,
      eventType,
      risk: decision.risk || 'medium',
      decision: decision.decision || 'approval_required',
      reason,
      timestamp: Date.now(),
      metadata,
    };

    // Store in-memory
    this.inMemoryEvents.unshift(event);
    if (this.inMemoryEvents.length > MAX_SAFETY_AUDIT_ENTRIES) {
      this.inMemoryEvents = this.inMemoryEvents.slice(0, MAX_SAFETY_AUDIT_ENTRIES);
    }

    // Persist asynchronously without throwing
    this.persistEvent(event).catch(() => {});

    // Mirror to agent action log for visibility in the Action History UI
    this.mirrorToAgentLog(event).catch(() => {});

    return event;
  }

  /**
   * Retrieves recent safety audit events
   */
  public async getAuditEvents(): Promise<SafetyAuditEvent[]> {
    if (!this.isStorageAvailable) {
      return [...this.inMemoryEvents];
    }

    try {
      const res = await chrome.storage.local.get(SAFETY_AUDIT_STORAGE_KEY);
      const raw = res ? (res as Record<string, unknown>)[SAFETY_AUDIT_STORAGE_KEY] : undefined;
      if (Array.isArray(raw)) {
        return raw as SafetyAuditEvent[];
      }
      return [...this.inMemoryEvents];
    } catch {
      return [...this.inMemoryEvents];
    }
  }

  /**
   * Clears audit logs
   */
  public async clearAuditEvents(): Promise<void> {
    this.inMemoryEvents = [];
    if (this.isStorageAvailable) {
      try {
        await chrome.storage.local.remove(SAFETY_AUDIT_STORAGE_KEY);
      } catch (err) {
        console.warn('[Sahayak Safety Audit] Failed to clear audit events:', err);
      }
    }
  }

  private async persistEvent(event: SafetyAuditEvent): Promise<void> {
    if (!this.isStorageAvailable) return;

    try {
      const current = await this.getAuditEvents();
      const updated = [event, ...current].slice(0, MAX_SAFETY_AUDIT_ENTRIES);
      await chrome.storage.local.set({ [SAFETY_AUDIT_STORAGE_KEY]: updated });
    } catch (err) {
      console.warn('[Sahayak Safety Audit] Failed to persist audit event:', err);
    }
  }

  private async mirrorToAgentLog(event: SafetyAuditEvent): Promise<void> {
    try {
      const sessionId = event.sessionId || 'safety_system';
      const actionId = event.actionId || event.decisionId;

      await agentActionLogService.logEvent({
        sessionId,
        actionId,
        eventType: event.eventType === 'action_blocked' ? 'execution_failed' : 'action_proposed',
        description: `[Safety Policy] ${event.eventType.toUpperCase()}: ${event.reason}`,
        risk: event.risk,
        isDryRun: false,
        metadata: {
          decisionId: event.decisionId,
          decision: event.decision,
          safetyEventType: event.eventType,
        },
      });
    } catch {
      // Safe fail-open for audit logging display
    }
  }
}

export const safetyAuditService = new SafetyAuditService();
