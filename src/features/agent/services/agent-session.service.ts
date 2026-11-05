/**
 * Sahayak Agent Session Service
 * Tracks execution state, history, active proposals, and enforces strict tab isolation.
 */

import {
  AgentSession,
  AgentSessionState,
  AgentAction,
  ActionExecutionResult,
} from '../types/agent.types';
import { CURRENT_SESSION_SCHEMA_VERSION } from '../schemas/agent-session.schema';

export class AgentSessionService {
  /** Active session map indexed by tabId */
  private sessions = new Map<number, AgentSession>();

  /**
   * Retrieves or initializes a session for the specified tab.
   */
  public getOrCreateSession(tabId: number): AgentSession {
    let session = this.sessions.get(tabId);
    if (!session) {
      session = {
        version: CURRENT_SESSION_SCHEMA_VERSION,
        sessionId: crypto.randomUUID(),
        tabId,
        userInstruction: '',
        state: 'idle',
        proposedAction: null,
        executedActions: [],
        actionResults: [],
        isDryRun: false,
        isRestored: false,
        isInterrupted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.sessions.set(tabId, session);
    }
    return session;
  }

  /**
   * Restores an existing persisted session into memory.
   */
  public restoreSession(session: AgentSession): AgentSession {
    this.sessions.set(session.tabId, session);
    return session;
  }

  /**
   * Retrieves active session for tab without creating if absent.
   */
  public getSession(tabId: number): AgentSession | undefined {
    return this.sessions.get(tabId);
  }

  /**
   * Updates session state.
   */
  public updateState(tabId: number, state: AgentSessionState, error?: string): AgentSession {
    const session = this.getOrCreateSession(tabId);
    session.state = state;
    session.error = error;
    session.updatedAt = Date.now();
    return session;
  }

  /** Alias for updateState */
  public transitionState = this.updateState.bind(this);

  /**
   * Sets page metadata on session.
   */
  public setMetadata(tabId: number, pageTitle?: string, pageUrl?: string): AgentSession {
    const session = this.getOrCreateSession(tabId);
    if (pageTitle) session.pageTitle = pageTitle;
    if (pageUrl) session.pageUrl = pageUrl;
    session.updatedAt = Date.now();
    return session;
  }

  /**
   * Sets dry-run mode for tab session.
   */
  public setDryRun(tabId: number, isDryRun: boolean): AgentSession {
    const session = this.getOrCreateSession(tabId);
    session.isDryRun = isDryRun;
    session.updatedAt = Date.now();
    return session;
  }

  /**
   * Sets proposed action and updates state to awaiting_approval.
   */
  public setProposedAction(tabId: number, instruction: string, action: AgentAction): AgentSession {
    const session = this.getOrCreateSession(tabId);
    session.userInstruction = instruction;
    session.proposedAction = action;
    session.state = 'awaiting_approval';
    session.error = undefined;
    session.updatedAt = Date.now();
    return session;
  }

  /**
   * Records an executed action and its result.
   */
  public recordExecution(
    tabId: number,
    action: AgentAction,
    result: ActionExecutionResult
  ): AgentSession {
    const session = this.getOrCreateSession(tabId);
    session.executedActions.push(action);
    session.actionResults.push(result);
    session.proposedAction = null;
    session.state =
      result.status === 'success' || result.status === 'preview_only' ? 'completed' : 'failed';
    session.updatedAt = Date.now();
    return session;
  }

  /** Alias for recordExecution */
  public recordExecutedAction = this.recordExecution.bind(this);

  /**
   * Cancels any pending action for the session.
   */
  public cancelSession(tabId: number): AgentSession {
    const session = this.getOrCreateSession(tabId);
    if (session.proposedAction && session.proposedAction.approvalStatus !== 'rejected') {
      session.proposedAction.approvalStatus = 'cancelled';
    }
    session.state = 'cancelled';
    session.proposedAction = null;
    session.updatedAt = Date.now();
    return session;
  }

  /**
   * Resets session to clean idle state.
   */
  public resetSession(tabId: number): AgentSession {
    const currentDryRun = this.sessions.get(tabId)?.isDryRun || false;
    const session: AgentSession = {
      version: CURRENT_SESSION_SCHEMA_VERSION,
      sessionId: crypto.randomUUID(),
      tabId,
      userInstruction: '',
      state: 'idle',
      proposedAction: null,
      executedActions: [],
      actionResults: [],
      isDryRun: currentDryRun,
      isRestored: false,
      isInterrupted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(tabId, session);
    return session;
  }
}

export const agentSessionService = new AgentSessionService();
