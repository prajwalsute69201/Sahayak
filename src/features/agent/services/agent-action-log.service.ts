/**
 * Sahayak Agent Structured Action Log Service
 * Manages auditing, lifecycle event recording, search filtering, and safe storage pruning.
 */

import { storageService } from '@/services/storage.service';
import { ActionLogEntry, ActionLogFilter } from '../types/agent-log.types';
import { agentMigrationService } from './agent-migration.service';
import { CURRENT_LOG_SCHEMA_VERSION } from '../schemas/agent-log.schema';

export const AGENT_LOGS_STORAGE_KEY = 'sahayak_agent_logs_v1';
export const DEFAULT_MAX_LOG_ENTRIES = 200;

export class AgentActionLogService {
  private inMemoryLogs: ActionLogEntry[] = [];
  private isLoaded = false;
  private maxEntries: number = DEFAULT_MAX_LOG_ENTRIES;

  constructor(maxEntries = DEFAULT_MAX_LOG_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  /**
   * Initializes log store from persistent storage.
   */
  public async loadLogs(): Promise<ActionLogEntry[]> {
    try {
      const raw = await storageService.get<unknown>(AGENT_LOGS_STORAGE_KEY, []);
      this.inMemoryLogs = agentMigrationService.migrateLogs(raw);
      this.isLoaded = true;
      return [...this.inMemoryLogs];
    } catch (err) {
      console.warn('[Sahayak Action Logger] Failed to load persisted logs, starting empty:', err);
      this.inMemoryLogs = [];
      this.isLoaded = true;
      return [];
    }
  }

  /**
   * Records a structured agent lifecycle event.
   */
  public async logEvent(
    params: Omit<ActionLogEntry, 'id' | 'timestamp'> & { timestamp?: number }
  ): Promise<ActionLogEntry> {
    if (!this.isLoaded) {
      await this.loadLogs();
    }

    const entry: ActionLogEntry = {
      ...params,
      id: crypto.randomUUID(),
      timestamp: params.timestamp || Date.now(),
    };

    // Prepend newest entry to the top
    this.inMemoryLogs.unshift(entry);

    // Prune if exceeds maxEntries
    if (this.inMemoryLogs.length > this.maxEntries) {
      this.inMemoryLogs = this.inMemoryLogs.slice(0, this.maxEntries);
    }

    // Persist asynchronously
    this.persistLogs().catch((err) => {
      console.warn('[Sahayak Action Logger] Failed to persist log entry:', err);
    });

    return entry;
  }

  /**
   * Retrieves filtered action logs.
   */
  public async getLogs(filter: ActionLogFilter = 'all', tabId?: number): Promise<ActionLogEntry[]> {
    if (!this.isLoaded) {
      await this.loadLogs();
    }

    return this.inMemoryLogs.filter((entry) => {
      // Tab filter
      if (tabId !== undefined && entry.tabId !== undefined && entry.tabId !== tabId) {
        return false;
      }

      // Category filter
      switch (filter) {
        case 'success':
          return entry.status === 'success' || entry.eventType === 'execution_completed';
        case 'failed':
          return (
            entry.status === 'failed' ||
            entry.status === 'target_not_found' ||
            entry.status === 'stale_target' ||
            entry.eventType === 'execution_failed' ||
            entry.eventType === 'target_not_found' ||
            entry.eventType === 'target_stale'
          );
        case 'rejected':
          return entry.status === 'rejected' || entry.eventType === 'action_rejected';
        case 'dry_run':
          return (
            entry.isDryRun ||
            entry.eventType === 'action_previewed' ||
            entry.status === 'preview_only'
          );
        case 'interrupted':
          return entry.status === 'interrupted' || entry.eventType === 'action_interrupted';
        case 'all':
        default:
          return true;
      }
    });
  }

  /**
   * Clears action logs from memory and storage.
   */
  public async clearLogs(tabId?: number): Promise<void> {
    if (tabId !== undefined) {
      this.inMemoryLogs = this.inMemoryLogs.filter((entry) => entry.tabId !== tabId);
    } else {
      this.inMemoryLogs = [];
    }
    await this.persistLogs();
  }

  /**
   * Returns total count of in-memory logs.
   */
  public getCount(): number {
    return this.inMemoryLogs.length;
  }

  /**
   * Safely writes in-memory logs to storage wrapped in a versioned envelope.
   */
  private async persistLogs(): Promise<void> {
    try {
      await storageService.set(AGENT_LOGS_STORAGE_KEY, {
        version: CURRENT_LOG_SCHEMA_VERSION,
        entries: this.inMemoryLogs,
      });
    } catch (err) {
      console.warn('[Sahayak Action Logger] Storage write error while saving logs:', err);
    }
  }
}

export const agentActionLogService = new AgentActionLogService();
