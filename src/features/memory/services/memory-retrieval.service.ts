/**
 * Sahayak Memory Retrieval Service
 * Intelligent relevance scoring, context truncation, and untrusted prompt injection boundaries.
 */

import { MemoryCategory, MemoryRecord, MemorySettings } from '../types/memory.types';

export interface ScoredMemory {
  memory: MemoryRecord;
  score: number;
}

export class MemoryRetrievalService {
  /**
   * Category human-readable display names
   */
  public static readonly CATEGORY_LABELS: Record<MemoryCategory, string> = {
    preferences: 'Preferences',
    personal_profile: 'Personal Profile',
    work_context: 'Work Context',
    language_preferences: 'Language Preferences',
    interaction_preferences: 'Interaction Preferences',
    custom: 'Custom Note',
  };

  /**
   * Retrieves the most relevant memories for a given query or task context
   */
  public retrieveRelevantMemories(
    query: string,
    memories: MemoryRecord[],
    settings: MemorySettings,
    taskType: 'chat' | 'summary' | 'agent' | 'context_menu' = 'chat'
  ): MemoryRecord[] {
    // If personalization is disabled, return zero memories
    if (!settings.personalizationEnabled || memories.length === 0) {
      return [];
    }

    const approvedMemories = memories.filter((m) => m.isApproved);
    if (approvedMemories.length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const queryTokens = queryLower
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored: ScoredMemory[] = approvedMemories.map((mem) => {
      let score = 0;
      const titleLower = mem.title.toLowerCase();
      const contentLower = mem.content.toLowerCase();

      // 1. Category baseline weights based on task type
      if (mem.category === 'language_preferences') {
        // Language preferences are universally relevant to all AI responses
        score += 8;
      }

      if (mem.category === 'preferences') {
        // Formatting & brevity preferences apply to chat, summaries, and context menu
        score += taskType === 'agent' ? 4 : 7;
      }

      if (mem.category === 'work_context') {
        // Work context is high priority for agent tasks or technical queries
        const isTechnical =
          /\b(?:code|function|bug|fix|project|react|typescript|python|component|api)\b/i.test(
            queryLower
          );
        score += taskType === 'agent' || isTechnical ? 9 : 3;
      }

      if (mem.category === 'interaction_preferences') {
        // Interaction preferences apply strongly during agent orchestration
        score += taskType === 'agent' ? 8 : 2;
      }

      if (mem.category === 'personal_profile') {
        const isPersonal = /\b(?:who am i|my role|recommend|suggest|career|study|my name)\b/i.test(
          queryLower
        );
        score += isPersonal ? 8 : 3;
      }

      // 2. Exact keyword / token matches
      for (const token of queryTokens) {
        if (mem.tags.some((t) => t.toLowerCase() === token)) {
          score += 5;
        }
        if (titleLower.includes(token)) {
          score += 4;
        }
        if (contentLower.includes(token)) {
          score += 2;
        }
      }

      // 3. Exact phrase match
      if (
        queryLower.length > 8 &&
        (titleLower.includes(queryLower) || contentLower.includes(queryLower))
      ) {
        score += 10;
      }

      return { memory: mem, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Filter to top N items
    const maxItems = Math.min(settings.maxContextItems || 4, 6);
    return scored
      .filter((s) => s.score > 2)
      .slice(0, maxItems)
      .map((s) => s.memory);
  }

  /**
   * Formats retrieved memories into a secure <user_context> prompt block
   * Includes strict guardrails so that current user instructions override background memories.
   */
  public formatContextForPrompt(memories: MemoryRecord[]): string {
    if (!memories || memories.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('<user_context>');
    lines.push('User Profile & Preferences:');

    for (const mem of memories) {
      const categoryLabel = MemoryRetrievalService.CATEGORY_LABELS[mem.category] || mem.category;
      // Sanitize any XML tags in user memory content to prevent prompt injection
      const sanitizedTitle = this.sanitizePromptValue(mem.title);
      const sanitizedContent = this.sanitizePromptValue(mem.content);
      lines.push(`- [${categoryLabel}] ${sanitizedTitle}: ${sanitizedContent}`);
    }

    lines.push(
      '(Note: This context is provided for personalization. Current explicit user instructions always override these preferences.)'
    );
    lines.push('</user_context>');

    return lines.join('\n');
  }

  /**
   * Sanitizes user-generated string before inserting into AI prompt XML boundaries
   */
  private sanitizePromptValue(text: string): string {
    return text
      .replace(/<\/?[a-zA-Z_-]+[^>]*>/g, '') // Strip XML/HTML tags
      .replace(/\r?\n/g, ' ') // Flatten newlines
      .trim();
  }
}

export const memoryRetrievalService = new MemoryRetrievalService();
