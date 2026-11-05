/**
 * Sahayak Skill Execution History Service
 * Lightweight local log of skill execution attempts, durations, and statuses.
 * Maintained completely separately from agent action logs and profile memories.
 */

import { SkillExecutionRecord } from '../types/skill.types';
import { MAX_HISTORY_ENTRIES, skillExecutionRecordSchema } from '../schemas/skill.schema';

export const SKILL_HISTORY_STORAGE_KEY = 'sahayak_skill_history_v1';

export class SkillHistoryService {
  private inMemoryHistory: SkillExecutionRecord[] = [];

  private get isStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local &&
      typeof chrome.storage.local.get === 'function'
    );
  }

  /**
   * Retrieves all skill execution history records, newest first
   */
  public async getHistory(skillId?: string): Promise<SkillExecutionRecord[]> {
    let records: SkillExecutionRecord[] = [];

    if (!this.isStorageAvailable) {
      records = [...this.inMemoryHistory];
    } else {
      try {
        const res = await chrome.storage.local.get(SKILL_HISTORY_STORAGE_KEY);
        const raw = res ? (res as Record<string, unknown>)[SKILL_HISTORY_STORAGE_KEY] : undefined;

        if (Array.isArray(raw)) {
          records = raw.filter((item) => skillExecutionRecordSchema.safeParse(item).success);
        }
      } catch {
        records = [...this.inMemoryHistory];
      }
    }

    if (skillId) {
      return records.filter((r) => r.skillId === skillId);
    }

    return records;
  }

  /**
   * Appends an execution record, keeping within MAX_HISTORY_ENTRIES
   */
  public async addRecord(record: SkillExecutionRecord): Promise<void> {
    const valid = skillExecutionRecordSchema.safeParse(record);
    if (!valid.success) {
      console.warn('[Sahayak Skill History] Invalid execution record:', valid.error);
      return;
    }

    const current = await this.getHistory();
    // Add to front and prune
    const updated = [
      valid.data,
      ...current.filter((r) => r.executionId !== valid.data.executionId),
    ].slice(0, MAX_HISTORY_ENTRIES);

    await this.persistHistory(updated);
  }

  /**
   * Updates an in-flight execution record
   */
  public async updateRecord(
    executionId: string,
    updates: Partial<SkillExecutionRecord>
  ): Promise<void> {
    const current = await this.getHistory();
    const index = current.findIndex((r) => r.executionId === executionId);

    if (index === -1) return;

    const updatedRecord: SkillExecutionRecord = {
      ...current[index],
      ...updates,
    };

    const valid = skillExecutionRecordSchema.safeParse(updatedRecord);
    if (valid.success) {
      current[index] = valid.data;
      await this.persistHistory(current);
    }
  }

  /**
   * Clears all skill execution history
   */
  public async clearHistory(): Promise<void> {
    await this.persistHistory([]);
  }

  /**
   * Deletes a single history record
   */
  public async deleteRecord(executionId: string): Promise<boolean> {
    const current = await this.getHistory();
    const filtered = current.filter((r) => r.executionId !== executionId);
    if (filtered.length === current.length) return false;

    await this.persistHistory(filtered);
    return true;
  }

  private async persistHistory(records: SkillExecutionRecord[]): Promise<void> {
    if (this.isStorageAvailable) {
      await chrome.storage.local.set({ [SKILL_HISTORY_STORAGE_KEY]: records });
    } else {
      this.inMemoryHistory = records;
    }
  }
}

export const skillHistoryService = new SkillHistoryService();
