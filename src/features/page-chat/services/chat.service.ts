/**
 * Chat Service
 * Orchestrates grounded multi-turn page conversations with streaming responses,
 * tab isolation, rolling context pruning, and graceful cancellation.
 */

import { geminiClient } from '@/services/gemini/gemini.client';
import { GeminiContent } from '@/services/gemini/gemini.types';
import { LanguagePreference } from '@/services/language/language.types';
import {
  ChatMessage,
  ConversationSession,
  PageContext,
  RetrievedContext,
} from '../types/chat.types';
import { contextRetrievalService } from './context-retrieval.service';
import { groundingService } from './grounding.service';
import { memoryService } from '@/features/memory/services/memory.service';

export interface SendMessageOptions {
  question: string;
  pageContext: PageContext;
  language: LanguagePreference;
  onChunk?: (chunkText: string, fullAggregatedText: string) => void;
  signal?: AbortSignal;
}

export class ChatService {
  public static readonly MAX_HISTORY_MESSAGES = 6; // Last 3 turns
  private sessions = new Map<string, ConversationSession>();

  /**
   * Generates a unique session key for tab & URL isolation.
   */
  public getSessionKey(tabId?: number, url?: string): string {
    const cleanUrl = (url || '').split('#')[0]; // Ignore URL hashes
    return `${tabId || 'active'}:${cleanUrl}`;
  }

  /**
   * Retrieves messages for the given tab & URL session.
   */
  public getSessionMessages(tabId?: number, url?: string): ChatMessage[] {
    const key = this.getSessionKey(tabId, url);
    return this.sessions.get(key)?.messages || [];
  }

  /**
   * Clears conversation history for the current tab & URL session.
   */
  public clearSession(tabId?: number, url?: string): void {
    const key = this.getSessionKey(tabId, url);
    this.sessions.delete(key);
  }

  /**
   * Appends a message to the active session.
   */
  public appendMessage(tabId: number | undefined, url: string, message: ChatMessage): void {
    const key = this.getSessionKey(tabId, url);
    const existing = this.sessions.get(key);
    const messages = existing ? [...existing.messages, message] : [message];

    this.sessions.set(key, {
      sessionKey: key,
      tabId,
      url,
      messages,
      updatedAt: Date.now(),
    });
  }

  /**
   * Updates an existing message in the session (e.g. streaming chunks or error status).
   */
  public updateMessage(
    tabId: number | undefined,
    url: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ): void {
    const key = this.getSessionKey(tabId, url);
    const session = this.sessions.get(key);
    if (!session) return;

    const messages = session.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m));

    this.sessions.set(key, {
      ...session,
      messages,
      updatedAt: Date.now(),
    });
  }

  /**
   * Sends a user question, retrieves relevant sections, and streams the answer.
   */
  public async sendQuestion(options: SendMessageOptions): Promise<{
    message: ChatMessage;
    retrievedContext: RetrievedContext;
  }> {
    const { question, pageContext, language, onChunk, signal } = options;
    const tabId = pageContext.tabId;
    const url = pageContext.url;

    // 1. Retrieve relevant sections for this specific query
    const retrievedContext = contextRetrievalService.retrieveRelevantSections(
      pageContext,
      question
    );

    // 2. Retrieve user profile context & build grounded system instruction
    const userContext = await memoryService.getRelevantContext(question, 'chat');
    const systemInstruction = groundingService.buildSystemInstruction({
      language,
      sampleInput: question,
      isPartialContext: retrievedContext.isPartialContext,
      userContext,
    });

    // 3. Prepare formatted user prompt with untrusted <PAGE_CONTEXT> delimiters
    const formattedPrompt = groundingService.formatGroundedUserPrompt(question, retrievedContext);

    // 4. Retrieve recent history for this session (pruned to limit tokens)
    const existingMessages = this.getSessionMessages(tabId, url);
    const prunedHistory = existingMessages
      .filter((m) => m.status === 'complete' || m.status === 'interrupted')
      .slice(-ChatService.MAX_HISTORY_MESSAGES);

    // Convert pruned history to Gemini contents format
    const contents: GeminiContent[] = [];

    for (let i = 0; i < prunedHistory.length; i++) {
      const msg = prunedHistory[i];
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    // Append current formatted question as the latest user turn
    contents.push({
      role: 'user',
      parts: [{ text: formattedPrompt }],
    });

    // 5. Call Gemini Streaming Client
    const streamResult = await geminiClient.generateStream(contents, {
      systemInstruction,
      temperature: 0.2, // Low temperature for high factual grounding
      signal,
      onChunk,
    });

    const isInterrupted = streamResult.finishReason === 'USER_CANCELLED';
    const sourceSections = this.extractReferencedSections(streamResult.text, retrievedContext);

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'model',
      content: streamResult.text,
      timestamp: Date.now(),
      status: isInterrupted ? 'interrupted' : 'complete',
      sourceSections,
      isGrounded: true,
      language,
    };

    return {
      message: assistantMessage,
      retrievedContext,
    };
  }

  /**
   * Helper: parses referenced section citations from the model response.
   */
  public extractReferencedSections(response: string, retrievedContext: RetrievedContext): string[] {
    const citations: string[] = [];
    const regex = /\[Section:\s*([^\]]+)\]/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(response)) !== null) {
      const sectionName = match[1].trim();
      if (!citations.includes(sectionName)) {
        citations.push(sectionName);
      }
    }

    // If none cited explicitly, attach the headings of retrieved sections that had high scores
    if (citations.length === 0 && retrievedContext.sections.length > 0) {
      const topHeadings = retrievedContext.sections
        .filter((s) => s.relevanceScore > 1.0)
        .map((s) => s.heading);
      if (topHeadings.length > 0) {
        citations.push(...topHeadings.slice(0, 2));
      }
    }

    return citations;
  }
}

export const chatService = new ChatService();
export default chatService;
