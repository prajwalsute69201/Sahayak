/**
 * Sahayak Unified Memory Service
 * High-level orchestration facade combining storage, extraction, retrieval, and settings.
 */

import {
  MemoryFilter,
  MemoryProposal,
  MemoryRecord,
  MemorySettings,
  MemoryStorageStats,
} from '../types/memory.types';
import { memoryStorageService } from './memory-storage.service';
import { memoryExtractionService, ExtractionResult } from './memory-extraction.service';
import { memoryRetrievalService } from './memory-retrieval.service';

export class MemoryService {
  /**
   * Evaluates user input for explicit or suggested memory intents
   */
  public async detectMemoryIntent(userInput: string): Promise<ExtractionResult> {
    const existingMemories = await memoryStorageService.getMemories();
    const settings = await memoryStorageService.getSettings();

    return memoryExtractionService.analyzeInput(
      userInput,
      existingMemories,
      settings.suggestionsEnabled
    );
  }

  /**
   * Approves a pending memory proposal and executes the proposed action.
   * Strictly human-in-the-loop approved.
   */
  public async approveProposal(proposal: MemoryProposal): Promise<MemoryRecord | null> {
    if (proposal.action === 'delete') {
      if (proposal.targetMemoryId) {
        await memoryStorageService.deleteMemory(proposal.targetMemoryId);
      }
      return null;
    }

    if (proposal.action === 'update' && proposal.targetMemoryId) {
      return await memoryStorageService.updateMemory(proposal.targetMemoryId, {
        category: proposal.category,
        title: proposal.title,
        content: proposal.content,
        tags: proposal.tags,
        source: proposal.source,
      });
    }

    // Default 'create'
    return await memoryStorageService.saveMemory({
      category: proposal.category,
      title: proposal.title,
      content: proposal.content,
      tags: proposal.tags,
      source: proposal.source,
      isApproved: true,
      confidence: proposal.confidence,
    });
  }

  /**
   * Retrieves formatted, safe <user_context> prompt string for AI personalization
   */
  public async getRelevantContext(
    query: string,
    taskType: 'chat' | 'summary' | 'agent' | 'context_menu' = 'chat'
  ): Promise<string> {
    const settings = await memoryStorageService.getSettings();
    if (!settings.personalizationEnabled) {
      return '';
    }

    const memories = await memoryStorageService.getMemories();
    const relevant = memoryRetrievalService.retrieveRelevantMemories(
      query,
      memories,
      settings,
      taskType
    );

    return memoryRetrievalService.formatContextForPrompt(relevant);
  }

  /**
   * Returns all memories, optionally filtered by category, search text, or tag
   */
  public async getAllMemories(filter?: MemoryFilter): Promise<MemoryRecord[]> {
    const memories = await memoryStorageService.getMemories();

    if (!filter) {
      return memories;
    }

    return memories.filter((mem) => {
      // Category filter
      if (filter.category && filter.category !== 'all' && mem.category !== filter.category) {
        return false;
      }

      // Search query filter (title, content, tags)
      if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
        const query = filter.searchQuery.toLowerCase().trim();
        const matchesTitle = mem.title.toLowerCase().includes(query);
        const matchesContent = mem.content.toLowerCase().includes(query);
        const matchesTag = mem.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesContent && !matchesTag) {
          return false;
        }
      }

      // Tag filter
      if (filter.tag && !mem.tags.includes(filter.tag)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Retrieves single memory by ID
   */
  public async getMemoryById(id: string): Promise<MemoryRecord | null> {
    return await memoryStorageService.getMemoryById(id);
  }

  /**
   * Manual creation of a memory record
   */
  public async createMemory(
    record: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MemoryRecord> {
    return await memoryStorageService.saveMemory(record);
  }

  /**
   * Manual update of an existing memory record
   */
  public async updateMemory(
    id: string,
    updates: Partial<Omit<MemoryRecord, 'id' | 'createdAt'>>
  ): Promise<MemoryRecord | null> {
    return await memoryStorageService.updateMemory(id, updates);
  }

  /**
   * Deletion of a single memory
   */
  public async deleteMemory(id: string): Promise<boolean> {
    return await memoryStorageService.deleteMemory(id);
  }

  /**
   * Clear all memories with confirmation
   */
  public async clearAll(): Promise<void> {
    await memoryStorageService.clearAllMemories();
  }

  /**
   * Gets memory settings
   */
  public async getSettings(): Promise<MemorySettings> {
    return await memoryStorageService.getSettings();
  }

  /**
   * Updates memory settings
   */
  public async updateSettings(updates: Partial<MemorySettings>): Promise<MemorySettings> {
    return await memoryStorageService.updateSettings(updates);
  }

  /**
   * Gets storage statistics
   */
  public async getStorageStats(): Promise<MemoryStorageStats> {
    return await memoryStorageService.getStorageStats();
  }

  /**
   * Exports memories JSON
   */
  public async exportMemoriesJson(): Promise<string> {
    return await memoryStorageService.exportMemoriesJson();
  }

  /**
   * Imports memories JSON
   */
  public async importMemoriesJson(
    jsonString: string
  ): Promise<{ importedCount: number; errors: string[] }> {
    return await memoryStorageService.importMemoriesJson(jsonString);
  }
}

export const memoryService = new MemoryService();
