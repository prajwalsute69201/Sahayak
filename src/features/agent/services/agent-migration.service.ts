/**
 * Sahayak Agent Migration Service
 * Handles data schema migrations, backward compatibility, and corrupted record sanitization.
 */

import {
  CURRENT_SESSION_SCHEMA_VERSION,
  persistedAgentSessionSchema,
  PersistedAgentSession,
} from '../schemas/agent-session.schema';
import {
  actionLogEntrySchema,
  actionLogCollectionSchema,
  ActionLogCollection,
} from '../schemas/agent-log.schema';
import { ActionLogEntry } from '../types/agent-log.types';
import { AgentSession, AgentAction } from '../types/agent.types';

export class AgentMigrationService {
  /**
   * Sanitizes and migrates a raw session object from storage.
   * Ensures backward compatibility and enforces safety guards on restored data.
   */
  public migrateSession(raw: unknown, tabId: number): AgentSession | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const data = raw as Record<string, unknown>;

    // Handle legacy unversioned sessions
    if (!('version' in data) || typeof data.version !== 'number') {
      data.version = CURRENT_SESSION_SCHEMA_VERSION;
    }

    // Ensure mandatory identifiers
    if (!data.sessionId || typeof data.sessionId !== 'string') {
      data.sessionId = crypto.randomUUID();
    }
    if (typeof data.tabId !== 'number') {
      data.tabId = tabId;
    }

    const parsed = persistedAgentSessionSchema.safeParse(data);
    if (!parsed.success) {
      console.warn(
        '[Sahayak Agent Migration] Failed to parse session, creating fallback:',
        parsed.error
      );
      return null;
    }

    const session: PersistedAgentSession = parsed.data;

    // Safety Gate: If restored session was in an active execution or approval state,
    // mark as interrupted and strictly clear any approval token!
    let state = session.state;
    let isInterrupted = Boolean(session.isInterrupted);
    const proposedAction = session.proposedAction ? { ...session.proposedAction } : null;

    if (state === 'planning' || state === 'awaiting_approval' || state === 'executing') {
      state = 'interrupted';
      isInterrupted = true;

      if (proposedAction) {
        // Strip approval token so it can never be executed
        delete proposedAction.approvalToken;
        if (proposedAction.approvalStatus === 'approved') {
          proposedAction.approvalStatus = 'cancelled';
        }
      }
    }

    return {
      version: CURRENT_SESSION_SCHEMA_VERSION,
      sessionId: session.sessionId,
      tabId: session.tabId,
      userInstruction: session.userInstruction || '',
      state,
      proposedAction: (proposedAction as unknown as AgentAction | null) ?? null,
      executedActions: (session.executedActions as unknown as AgentAction[]) || [],
      actionResults:
        (session.actionResults as unknown as import('../types/agent.types').ActionExecutionResult[]) ||
        [],
      pageTitle: session.pageTitle,
      pageUrl: session.pageUrl,
      isDryRun: Boolean(session.isDryRun),
      isRestored: true,
      isInterrupted,
      error: session.error,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  /**
   * Sanitizes and migrates raw log collection from storage.
   */
  public migrateLogs(raw: unknown): ActionLogEntry[] {
    if (!raw) {
      return [];
    }

    // If array of entries directly
    if (Array.isArray(raw)) {
      const validEntries: ActionLogEntry[] = [];
      for (const item of raw) {
        const parsed = actionLogEntrySchema.safeParse(item);
        if (parsed.success) {
          validEntries.push(parsed.data);
        }
      }
      return validEntries;
    }

    // If versioned collection object
    if (typeof raw === 'object' && raw !== null) {
      const collection = raw as Partial<ActionLogCollection>;
      if (Array.isArray(collection.entries)) {
        const parsedCollection = actionLogCollectionSchema.safeParse(collection);
        if (parsedCollection.success) {
          return parsedCollection.data.entries;
        }
      }
    }

    return [];
  }
}

export const agentMigrationService = new AgentMigrationService();
