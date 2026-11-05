/**
 * Sahayak Agent Persistence Service
 * Saves, restores, and manages tab-isolated agent session states in Chrome Storage.
 */

import { storageService } from '@/services/storage.service';
import { AgentSession } from '../types/agent.types';
import { agentMigrationService } from './agent-migration.service';
import { CURRENT_SESSION_SCHEMA_VERSION } from '../schemas/agent-session.schema';

export const AGENT_SESSIONS_STORAGE_KEY = 'sahayak_agent_sessions_v1';
export const AGENT_DRY_RUN_STORAGE_KEY = 'sahayak_agent_dry_run_mode';

export class AgentPersistenceService {
  /**
   * Persists an active session into storage.
   */
  public async saveSession(session: AgentSession): Promise<void> {
    try {
      const allSessions = await this.getAllSessionsMap();
      allSessions[String(session.tabId)] = {
        ...session,
        version: CURRENT_SESSION_SCHEMA_VERSION,
        updatedAt: Date.now(),
      };
      await storageService.set(AGENT_SESSIONS_STORAGE_KEY, allSessions);
    } catch (err) {
      console.warn(
        `[Sahayak Agent Persistence] Failed to save session for tab ${session.tabId}:`,
        err
      );
    }
  }

  /**
   * Retrieves and restores the persisted session for a specific tab.
   * Enforces safety gates: restores information, not execution authority.
   */
  public async loadSession(tabId: number): Promise<AgentSession | null> {
    try {
      const allSessions = await this.getAllSessionsMap();
      const raw = allSessions[String(tabId)];
      if (!raw) {
        return null;
      }

      return agentMigrationService.migrateSession(raw, tabId);
    } catch (err) {
      console.warn(`[Sahayak Agent Persistence] Failed to load session for tab ${tabId}:`, err);
      return null;
    }
  }

  /**
   * Removes session for a closed or reset tab.
   */
  public async deleteSession(tabId: number): Promise<void> {
    try {
      const allSessions = await this.getAllSessionsMap();
      if (String(tabId) in allSessions) {
        delete allSessions[String(tabId)];
        await storageService.set(AGENT_SESSIONS_STORAGE_KEY, allSessions);
      }
    } catch (err) {
      console.warn(`[Sahayak Agent Persistence] Failed to delete session for tab ${tabId}:`, err);
    }
  }

  /**
   * Clears all persisted sessions.
   */
  public async clearAllSessions(): Promise<void> {
    try {
      await storageService.set(AGENT_SESSIONS_STORAGE_KEY, {});
    } catch (err) {
      console.warn('[Sahayak Agent Persistence] Failed to clear sessions:', err);
    }
  }

  /**
   * Reads persistent Dry-Run Mode setting.
   */
  public async getDryRunMode(): Promise<boolean> {
    try {
      return await storageService.get<boolean>(AGENT_DRY_RUN_STORAGE_KEY, false);
    } catch {
      return false;
    }
  }

  /**
   * Updates persistent Dry-Run Mode setting.
   */
  public async setDryRunMode(enabled: boolean): Promise<void> {
    try {
      await storageService.set(AGENT_DRY_RUN_STORAGE_KEY, enabled);
    } catch (err) {
      console.warn('[Sahayak Agent Persistence] Failed to set dry run mode:', err);
    }
  }

  /**
   * Internal helper to load raw sessions map.
   */
  private async getAllSessionsMap(): Promise<Record<string, unknown>> {
    try {
      const result = await storageService.get<Record<string, unknown>>(
        AGENT_SESSIONS_STORAGE_KEY,
        {}
      );
      return result && typeof result === 'object' ? result : {};
    } catch {
      return {};
    }
  }
}

export const agentPersistenceService = new AgentPersistenceService();
