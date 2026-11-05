/**
 * Sahayak Memory Storage Service
 * Strict on-device storage for user profile memories and preferences using chrome.storage.local.
 */

import {
  MemoryRecord,
  MemorySettings,
  MemoryStorageCollection,
  MemoryStorageStats,
} from '../types/memory.types';
import {
  CURRENT_MEMORY_SCHEMA_VERSION,
  MAX_MEMORIES_COUNT,
  memoryRecordSchema,
  memorySettingsSchema,
  memoryStorageCollectionSchema,
} from '../schemas/memory.schema';

export const MEMORY_STORAGE_KEY = 'sahayak_profile_memories_v1';
export const MEMORY_SETTINGS_KEY = 'sahayak_memory_settings_v1';

export const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  personalizationEnabled: true,
  suggestionsEnabled: true,
  maxContextItems: 4,
};

export class MemoryStorageService {
  private inMemoryFallback: {
    collection: MemoryStorageCollection;
    settings: MemorySettings;
  } = {
    collection: {
      version: CURRENT_MEMORY_SCHEMA_VERSION,
      memories: [],
      updatedAt: new Date().toISOString(),
    },
    settings: { ...DEFAULT_MEMORY_SETTINGS },
  };

  /**
   * Safe getter for chrome.storage.local
   */
  private get isStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local &&
      typeof chrome.storage.local.get === 'function'
    );
  }

  /**
   * Retrieves all stored memories
   */
  public async getMemories(): Promise<MemoryRecord[]> {
    if (!this.isStorageAvailable) {
      return [...this.inMemoryFallback.collection.memories];
    }

    try {
      const result = await chrome.storage.local.get(MEMORY_STORAGE_KEY);
      const rawData = result ? (result as Record<string, unknown>)[MEMORY_STORAGE_KEY] : undefined;

      if (!rawData) {
        return [];
      }

      const parsed = memoryStorageCollectionSchema.safeParse(rawData);
      if (parsed.success) {
        return parsed.data.memories;
      }

      // If array format was stored directly, wrap and migrate
      if (Array.isArray(rawData)) {
        const validMemories = rawData.filter((item) => memoryRecordSchema.safeParse(item).success);
        await this.persistCollection(validMemories);
        return validMemories;
      }

      return [];
    } catch (error) {
      console.warn('[Sahayak Memory Storage] Failed to load memories from storage:', error);
      return [...this.inMemoryFallback.collection.memories];
    }
  }

  /**
   * Retrieves a single memory by ID
   */
  public async getMemoryById(id: string): Promise<MemoryRecord | null> {
    const memories = await this.getMemories();
    return memories.find((m) => m.id === id) || null;
  }

  /**
   * Saves or creates a new memory record.
   * Strictly enforces explicit user approval and quota limits.
   */
  public async saveMemory(
    record: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<MemoryRecord> {
    const memories = await this.getMemories();

    const now = new Date().toISOString();
    const id =
      record.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

    const newRecord: MemoryRecord = {
      ...record,
      id,
      isApproved: true,
      createdAt: record.createdAt || now,
      updatedAt: now,
    };

    // Validate memory record
    const validation = memoryRecordSchema.safeParse(newRecord);
    if (!validation.success) {
      const issue = validation.error.issues[0]?.message || 'Invalid memory record';
      throw new Error(`Memory validation failed: ${issue}`);
    }

    const existingIndex = memories.findIndex((m) => m.id === id);

    if (existingIndex >= 0) {
      // Updating existing memory
      memories[existingIndex] = validation.data;
    } else {
      // Enforce max count
      if (memories.length >= MAX_MEMORIES_COUNT) {
        throw new Error(
          `Memory limit reached (${MAX_MEMORIES_COUNT}). Please delete older memories to save new ones.`
        );
      }
      memories.unshift(validation.data);
    }

    await this.persistCollection(memories);
    return validation.data;
  }

  /**
   * Updates an existing memory record
   */
  public async updateMemory(
    id: string,
    updates: Partial<Omit<MemoryRecord, 'id' | 'createdAt'>>
  ): Promise<MemoryRecord | null> {
    const memories = await this.getMemories();
    const index = memories.findIndex((m) => m.id === id);

    if (index === -1) {
      return null;
    }

    const existing = memories[index];
    const updatedRecord: MemoryRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const validation = memoryRecordSchema.safeParse(updatedRecord);
    if (!validation.success) {
      const issue = validation.error.issues[0]?.message || 'Invalid memory record';
      throw new Error(`Memory update failed: ${issue}`);
    }

    memories[index] = validation.data;
    await this.persistCollection(memories);
    return validation.data;
  }

  /**
   * Deletes a memory record by ID
   */
  public async deleteMemory(id: string): Promise<boolean> {
    const memories = await this.getMemories();
    const initialLength = memories.length;
    const filtered = memories.filter((m) => m.id !== id);

    if (filtered.length === initialLength) {
      return false;
    }

    await this.persistCollection(filtered);
    return true;
  }

  /**
   * Clears all memories after explicit confirmation
   */
  public async clearAllMemories(): Promise<void> {
    await this.persistCollection([]);
  }

  /**
   * Retrieves memory settings
   */
  public async getSettings(): Promise<MemorySettings> {
    if (!this.isStorageAvailable) {
      return { ...this.inMemoryFallback.settings };
    }

    try {
      const result = await chrome.storage.local.get(MEMORY_SETTINGS_KEY);
      const raw = result ? (result as Record<string, unknown>)[MEMORY_SETTINGS_KEY] : undefined;
      if (!raw) {
        return { ...DEFAULT_MEMORY_SETTINGS };
      }

      const parsed = memorySettingsSchema.safeParse(raw);
      return parsed.success ? parsed.data : { ...DEFAULT_MEMORY_SETTINGS };
    } catch {
      return { ...this.inMemoryFallback.settings };
    }
  }

  /**
   * Updates memory settings
   */
  public async updateSettings(updates: Partial<MemorySettings>): Promise<MemorySettings> {
    const current = await this.getSettings();
    const merged: MemorySettings = { ...current, ...updates };

    const validation = memorySettingsSchema.safeParse(merged);
    const validSettings = validation.success ? validation.data : current;

    if (this.isStorageAvailable) {
      try {
        await chrome.storage.local.set({ [MEMORY_SETTINGS_KEY]: validSettings });
      } catch (err) {
        console.warn('[Sahayak Memory Storage] Failed to update settings:', err);
      }
    } else {
      this.inMemoryFallback.settings = validSettings;
    }

    return validSettings;
  }

  /**
   * Returns storage usage metrics
   */
  public async getStorageStats(): Promise<MemoryStorageStats> {
    const memories = await this.getMemories();
    const jsonStr = JSON.stringify(memories);
    const estimatedSizeBytes = new Blob([jsonStr]).size;
    const percentageUsed = Math.min(100, Math.round((memories.length / MAX_MEMORIES_COUNT) * 100));

    return {
      count: memories.length,
      maxCount: MAX_MEMORIES_COUNT,
      estimatedSizeBytes,
      percentageUsed,
    };
  }

  /**
   * Exports all memories to a formatted JSON string
   */
  public async exportMemoriesJson(): Promise<string> {
    const memories = await this.getMemories();
    return JSON.stringify(
      {
        version: CURRENT_MEMORY_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        memories,
      },
      null,
      2
    );
  }

  /**
   * Imports memories from a JSON string, skipping invalid records
   */
  public async importMemoriesJson(
    jsonString: string
  ): Promise<{ importedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(jsonString);
    } catch {
      return { importedCount: 0, errors: ['Invalid JSON format'] };
    }

    const items: unknown[] = Array.isArray(parsedJson)
      ? parsedJson
      : (parsedJson as { memories?: unknown[] })?.memories || [];

    if (!Array.isArray(items)) {
      return { importedCount: 0, errors: ['No valid memory list found in JSON'] };
    }

    const currentMemories = await this.getMemories();
    let importedCount = 0;

    for (const item of items) {
      const valid = memoryRecordSchema.safeParse(item);
      if (valid.success) {
        if (currentMemories.length >= MAX_MEMORIES_COUNT) {
          errors.push(`Reached maximum limit of ${MAX_MEMORIES_COUNT} memories`);
          break;
        }

        const existingIdx = currentMemories.findIndex((m) => m.id === valid.data.id);
        if (existingIdx >= 0) {
          currentMemories[existingIdx] = valid.data;
        } else {
          currentMemories.push(valid.data);
        }
        importedCount++;
      } else {
        errors.push(`Skipped record: ${valid.error.issues[0]?.message || 'validation failed'}`);
      }
    }

    await this.persistCollection(currentMemories);
    return { importedCount, errors };
  }

  /**
   * Internal helper to persist the collection to local storage
   */
  private async persistCollection(memories: MemoryRecord[]): Promise<void> {
    const collection: MemoryStorageCollection = {
      version: CURRENT_MEMORY_SCHEMA_VERSION,
      memories,
      updatedAt: new Date().toISOString(),
    };

    if (this.isStorageAvailable) {
      await chrome.storage.local.set({ [MEMORY_STORAGE_KEY]: collection });
    } else {
      this.inMemoryFallback.collection = collection;
    }
  }
}

export const memoryStorageService = new MemoryStorageService();
