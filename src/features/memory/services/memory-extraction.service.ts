/**
 * Sahayak Memory Extraction Service
 * Natural language intent parsing for English and Romanized Hinglish memory instructions.
 * Strictly creates proposals — never modifies storage without explicit human confirmation.
 */

import { MemoryCategory, MemoryProposal, MemoryRecord } from '../types/memory.types';

export interface ExtractionResult {
  proposal: MemoryProposal | null;
  isMemoryIntent: boolean;
  intentType?: 'create' | 'update' | 'delete' | 'suggest';
}

export class MemoryExtractionService {
  /**
   * Sensitive data patterns that must NEVER be saved to local memory
   */
  private readonly SENSITIVE_PATTERNS = [
    /\b(?:api[_-]?key|secret|token|bearer|auth|password|passwd|pwd)\b(?:\s+is)?[:=\s]+[^\s]{6,}/i,
    /\b(?:password|passwd|pwd)\s+is\s+\S+/i,
    /\b(?:AIza[0-9A-Za-z-_]{30,}|gsk_[a-zA-Z0-9]{25,})\b/, // Gemini & Groq keys
    /\b(?:\d{4}[ -]?){3}\d{4}\b/, // Credit card numbers
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  ];

  /**
   * English patterns for explicit memory addition
   */
  private readonly EN_REMEMBER_PATTERNS = [
    /^(?:please\s+)?(?:remember|note|keep\s+in\s+mind|don't\s+forget|dont\s+forget)(?:\s+that)?\s+(.+)$/i,
    /^(?:always\s+remember(?:\s+that)?)\s+(.+)$/i,
    /^(?:make\s+a\s+note\s+that)\s+(.+)$/i,
    /^(?:save\s+to\s+(?:my\s+)?memory(?:\s+that)?)\s+(.+)$/i,
    /^(?:my\s+(?:preferred\s+)?(?:language|role|name|project|stack|tech\s+stack)\s+is)\s+(.+)$/i,
    /^(?:i\s+(?:always\s+)?(?:prefer|want|like))\s+(.+)$/i,
  ];

  /**
   * Romanized Hinglish patterns for explicit memory addition
   */
  private readonly HINGLISH_REMEMBER_PATTERNS = [
    /(?:yaad\s+rakhna|yaad\s+rakho|dhyaan\s+rakhna|dhyaan\s+rakho|dhyan\s+rakhna|dhyan\s+rakho)(?:\s+ki)?\s+(.+)/i,
    /(?:ye\s+yaad\s+rakhna(?:\s+ki)?)\s+(.+)/i,
    /(?:mera|meri|mere)\s+(?:naam|project|language|role|stack|tech\s+stack)\s+(.+)\s+hai/i,
    /(?:mujhe|humko)\s+(.+)\s+(?:pasand\s+hai|chahiye|me\s+reply\s+karo)/i,
    /(.+)\s+(?:yaad\s+rakhna|yaad\s+rakho)/i,
  ];

  /**
   * English patterns for explicit memory deletion / forgetting
   */
  private readonly EN_FORGET_PATTERNS = [
    /^(?:please\s+)?(?:forget|delete|remove|clear|erase)(?:\s+(?:my|the|that))?\s+(.+)$/i,
    /^(?:don't|dont|do\s+not)\s+remember(?:\s+(?:that|my))?\s+(.+)$/i,
    /^(?:stop\s+remembering(?:\s+that)?)\s+(.+)$/i,
    /^(?:remove\s+from\s+memory)\s+(.+)$/i,
  ];

  /**
   * Romanized Hinglish patterns for explicit memory deletion / forgetting
   */
  private readonly HINGLISH_FORGET_PATTERNS = [
    /(?:bhool\s+jao|bhula\s+do|hata\s+do|delete\s+kar\s+do|remove\s+kar\s+do)(?:\s+(?:mera|meri|ki))?\s+(.+)/i,
    /(.+)\s+(?:bhool\s+jao|bhula\s+do|hata\s+do)/i,
    /(?:ye\s+yaad\s+mat\s+rakhna)/i,
    /(?:mera|meri)\s+(.+)\s+(?:bhool\s+jao|hata\s+do)/i,
  ];

  /**
   * Checks if input contains sensitive private keys, passwords, or tokens
   */
  public containsSensitiveData(text: string): boolean {
    return this.SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Analyzes user input and produces a memory proposal if explicit instruction or suggestion matches
   */
  public analyzeInput(
    text: string,
    existingMemories: MemoryRecord[] = [],
    allowSuggestions = true
  ): ExtractionResult {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 5) {
      return { proposal: null, isMemoryIntent: false };
    }

    // Safety guard: reject sensitive credentials
    if (this.containsSensitiveData(trimmed)) {
      return { proposal: null, isMemoryIntent: false };
    }

    // 1. Check for Forget / Delete Instruction
    const deleteMatch = this.matchPatterns(trimmed, [
      ...this.EN_FORGET_PATTERNS,
      ...this.HINGLISH_FORGET_PATTERNS,
    ]);

    if (deleteMatch) {
      const targetQuery = deleteMatch.toLowerCase();
      const matchedMemory = this.findBestMatchingMemory(targetQuery, existingMemories);

      if (matchedMemory) {
        const proposal: MemoryProposal = {
          id: this.generateId('prop_del_'),
          action: 'delete',
          category: matchedMemory.category,
          title: matchedMemory.title,
          content: matchedMemory.content,
          tags: matchedMemory.tags,
          source: 'explicit_instruction',
          confidence: 0.95,
          targetMemoryId: matchedMemory.id,
          existingMemory: matchedMemory,
          triggerText: trimmed,
        };
        return { proposal, isMemoryIntent: true, intentType: 'delete' };
      }
    }

    // 2. Check for Remember / Note Instruction
    const rememberMatch = this.matchPatterns(trimmed, [
      ...this.EN_REMEMBER_PATTERNS,
      ...this.HINGLISH_REMEMBER_PATTERNS,
    ]);

    if (rememberMatch) {
      const extractedContent = this.cleanExtractedContent(rememberMatch);
      const category = this.classifyCategory(trimmed, extractedContent);
      const title = this.generateTitle(extractedContent, category);
      const tags = this.extractTags(extractedContent, category);

      // Check for conflict or update against existing memories
      const conflict = this.detectConflict(category, title, extractedContent, existingMemories);

      const proposal: MemoryProposal = {
        id: this.generateId('prop_'),
        action: conflict ? 'update' : 'create',
        category,
        title,
        content: extractedContent,
        tags,
        source: 'explicit_instruction',
        confidence: 0.95,
        targetMemoryId: conflict?.id,
        existingMemory: conflict || undefined,
        triggerText: trimmed,
      };

      return {
        proposal,
        isMemoryIntent: true,
        intentType: conflict ? 'update' : 'create',
      };
    }

    // 3. Optional Suggestions (if user explicitly repeats styling or mode preferences without "remember")
    if (allowSuggestions) {
      const suggestionProposal = this.checkImplicitSuggestion(trimmed, existingMemories);
      if (suggestionProposal) {
        return {
          proposal: suggestionProposal,
          isMemoryIntent: false, // Not a blocking explicit command, but an available suggestion
          intentType: 'suggest',
        };
      }
    }

    return { proposal: null, isMemoryIntent: false };
  }

  /**
   * Matches input string against a list of regular expressions
   */
  private matchPatterns(input: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Cleans extracted raw content
   */
  private cleanExtractedContent(raw: string): string {
    let cleaned = raw.trim();
    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    // Remove trailing punctuation except dot
    cleaned = cleaned.replace(/[!?]+$/, '');
    if (!cleaned.endsWith('.')) {
      cleaned += '.';
    }
    return cleaned;
  }

  /**
   * Classifies memory into one of the 6 recognized categories
   */
  public classifyCategory(fullPrompt: string, content: string): MemoryCategory {
    const combined = `${fullPrompt} ${content}`.toLowerCase();

    // Language Preferences
    if (
      /\b(?:hinglish|hindi|english|bhasha|zubaan|language|translate|translation|reply in|respond in)\b/i.test(
        combined
      )
    ) {
      return 'language_preferences';
    }

    // Work Context
    if (
      /\b(?:project|repository|repo|stack|tech stack|codebase|react|vue|angular|node|python|typescript|vite|tailwind|github|frontend|backend)\b/i.test(
        combined
      )
    ) {
      return 'work_context';
    }

    // Personal Profile
    if (
      /\b(?:my name is|i am a|i am an|role|job|engineer|developer|student|designer|profession|reside|live in|city)\b/i.test(
        combined
      )
    ) {
      return 'personal_profile';
    }

    // Interaction Preferences
    if (
      /\b(?:dry[ -]?run|approval|confirm|confirmation|preview|step[ -]?by[ -]?step|hitl|badge|overlay|theme|dark mode|light mode)\b/i.test(
        combined
      )
    ) {
      return 'interaction_preferences';
    }

    // General Preferences (Style, Depth, Formatting)
    if (
      /\b(?:concise|brief|short|bullet points|bullets|detailed|deep dive|explain simply|simple explanation|beginner|tone|formal|casual)\b/i.test(
        combined
      )
    ) {
      return 'preferences';
    }

    return 'custom';
  }

  /**
   * Generates a descriptive title from content and category
   */
  public generateTitle(content: string, category: MemoryCategory): string {
    const lower = content.toLowerCase();

    switch (category) {
      case 'language_preferences':
        if (lower.includes('hinglish')) return 'Language Preference: Hinglish';
        if (lower.includes('hindi')) return 'Language Preference: Hindi';
        if (lower.includes('english')) return 'Language Preference: English';
        return 'Language Preference';

      case 'preferences':
        if (lower.includes('concise') || lower.includes('short') || lower.includes('brief'))
          return 'Response Style: Concise';
        if (lower.includes('bullet')) return 'Formatting: Bullet Points';
        if (lower.includes('detailed') || lower.includes('deep dive'))
          return 'Response Style: Detailed Deep Dive';
        if (lower.includes('simple')) return 'Explanation: Simple & Beginner-friendly';
        return 'Response Preference';

      case 'work_context':
        if (lower.includes('sahayak')) return 'Active Project: Sahayak Extension';
        if (lower.includes('react')) return 'Tech Stack: React & Frontend';
        if (lower.includes('python')) return 'Tech Stack: Python';
        return 'Work & Project Context';

      case 'personal_profile':
        if (lower.includes('name is')) {
          const match = content.match(/name is\s+([A-Za-z]+)/i);
          if (match && match[1]) return `User Profile: ${match[1]}`;
        }
        if (lower.includes('developer') || lower.includes('engineer'))
          return 'User Profile: Software Developer';
        return 'Personal Profile';

      case 'interaction_preferences':
        if (lower.includes('dry') || lower.includes('preview'))
          return 'Workflow: Always Show Dry-Run Preview';
        if (lower.includes('approval') || lower.includes('confirm'))
          return 'Workflow: Require Explicit HITL Approval';
        return 'Interaction Preference';

      case 'custom':
      default: {
        // Truncate first 5-7 words
        const words = content
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .slice(0, 6)
          .join(' ');
        return words.length > 4 ? `${words}...` : 'User Note';
      }
    }
  }

  /**
   * Extracts relevant searchable tags from content and category
   */
  public extractTags(content: string, category: MemoryCategory): string[] {
    const tags = new Set<string>();
    tags.add(category.replace('_', '-'));

    const words = content
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/);

    const KEYWORDS = [
      'hinglish',
      'english',
      'hindi',
      'concise',
      'brief',
      'bullets',
      'detailed',
      'react',
      'typescript',
      'javascript',
      'python',
      'developer',
      'engineer',
      'sahayak',
      'project',
      'dry-run',
      'hitl',
      'approval',
    ];

    for (const word of words) {
      if (KEYWORDS.includes(word) && !tags.has(word)) {
        tags.add(word);
      }
    }

    return Array.from(tags).slice(0, 6);
  }

  /**
   * Detects semantic conflict or overlap with existing memories in the same category
   */
  public detectConflict(
    category: MemoryCategory,
    title: string,
    content: string,
    existingMemories: MemoryRecord[]
  ): MemoryRecord | null {
    // Look for memories in the same category
    const categoryMatches = existingMemories.filter((m) => m.category === category);
    if (categoryMatches.length === 0) {
      return null;
    }

    // Check language preferences conflict (only 1 primary language preference should be active)
    if (category === 'language_preferences') {
      return categoryMatches[0] || null;
    }

    // Check response style conflict
    if (category === 'preferences' && title.startsWith('Response Style')) {
      const existingStyle = categoryMatches.find((m) => m.title.startsWith('Response Style'));
      if (existingStyle) return existingStyle;
    }

    // Check title overlap
    const titleLower = title.toLowerCase();
    for (const mem of categoryMatches) {
      if (mem.title.toLowerCase() === titleLower) {
        return mem;
      }
      // Check high keyword overlap
      const commonTags = mem.tags.filter((t) => content.toLowerCase().includes(t));
      if (commonTags.length >= 2) {
        return mem;
      }
    }

    return null;
  }

  /**
   * Finds the best matching memory for a deletion or search query
   */
  public findBestMatchingMemory(
    query: string,
    existingMemories: MemoryRecord[]
  ): MemoryRecord | null {
    const queryLower = query.toLowerCase();
    const queryTokens = queryLower.split(/\s+/).filter((t) => t.length > 2);

    let bestMatch: MemoryRecord | null = null;
    let highestScore = 0;

    for (const memory of existingMemories) {
      let score = 0;
      const titleLower = memory.title.toLowerCase();
      const contentLower = memory.content.toLowerCase();

      if (titleLower.includes(queryLower) || contentLower.includes(queryLower)) {
        score += 10;
      }

      for (const token of queryTokens) {
        if (titleLower.includes(token)) score += 3;
        if (contentLower.includes(token)) score += 2;
        if (memory.tags.some((t) => t.toLowerCase() === token)) score += 4;
        if (memory.category.toLowerCase().includes(token)) score += 2;
      }

      if (score > highestScore && score >= 3) {
        highestScore = score;
        bestMatch = memory;
      }
    }

    return bestMatch;
  }

  /**
   * Checks for implicit suggestions when user demonstrates a strong preference without explicit command
   */
  private checkImplicitSuggestion(
    text: string,
    existingMemories: MemoryRecord[]
  ): MemoryProposal | null {
    const lower = text.toLowerCase();

    // Check for repetitive requests like "always respond in Hinglish"
    if (
      lower.includes('always respond in hinglish') ||
      lower.includes('reply in hinglish please') ||
      lower.includes('keep in hinglish')
    ) {
      if (
        !existingMemories.some(
          (m) =>
            m.category === 'language_preferences' && m.content.toLowerCase().includes('hinglish')
        )
      ) {
        return {
          id: this.generateId('prop_sug_'),
          action: 'create',
          category: 'language_preferences',
          title: 'Language Preference: Hinglish',
          content: 'Prefers responses in Romanized Hinglish (Hindi written in Roman script).',
          tags: ['language', 'hinglish', 'preferences'],
          source: 'suggestion_accepted',
          confidence: 0.8,
          triggerText: text,
        };
      }
    }

    // Check for "always use bullet points" or "only give short bullets"
    if (lower.includes('only bullets') || lower.includes('always use bullet points')) {
      if (!existingMemories.some((m) => m.content.toLowerCase().includes('bullet'))) {
        return {
          id: this.generateId('prop_sug_'),
          action: 'create',
          category: 'preferences',
          title: 'Formatting: Bullet Points',
          content: 'Prefers structured answers formatted with clear bullet points.',
          tags: ['preferences', 'formatting', 'bullets'],
          source: 'suggestion_accepted',
          confidence: 0.8,
          triggerText: text,
        };
      }
    }

    return null;
  }

  private generateId(prefix = 'prop_'): string {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }
}

export const memoryExtractionService = new MemoryExtractionService();
