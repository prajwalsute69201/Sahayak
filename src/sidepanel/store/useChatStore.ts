/**
 * Sahayak Chat Store
 * Zustand store managing grounded page conversations, streaming state,
 * and session isolation across browser tabs.
 */

import { create } from 'zustand';
import { ChatMessage, PageContext } from '@/features/page-chat/types/chat.types';
import { pageContextService } from '@/features/page-chat/services/page-context.service';
import { chatService } from '@/features/page-chat/services/chat.service';
import { useSettingsStore } from '@/store/useSettingsStore';
import { MemoryProposal } from '@/features/memory/types/memory.types';
import { memoryService } from '@/features/memory/services/memory.service';

interface ChatStoreState {
  pageContext: PageContext | null;
  isLoadingContext: boolean;
  contextError: string | null;
  sessions: Record<string, ChatMessage[]>;
  isGenerating: boolean;
  activeStreamText: string;
  activeMessageId: string | null;
  currentAbortController: AbortController | null;
  pendingMemoryProposal: MemoryProposal | null;

  // Actions
  loadPageContext: (forceRefresh?: boolean) => Promise<void>;
  sendMessage: (question: string) => Promise<void>;
  stopGeneration: () => void;
  clearCurrentConversation: () => void;
  retryLastMessage: () => Promise<void>;
  appendCompletedTurn: (userText: string, assistantText: string) => void;
  getCurrentSessionKey: () => string;
  getCurrentMessages: () => ChatMessage[];
  approveMemoryProposal: (proposal?: MemoryProposal) => Promise<void>;
  rejectMemoryProposal: () => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  pageContext: null,
  isLoadingContext: false,
  contextError: null,
  sessions: {},
  isGenerating: false,
  activeStreamText: '',
  activeMessageId: null,
  currentAbortController: null,
  pendingMemoryProposal: null,

  getCurrentSessionKey: () => {
    const ctx = get().pageContext;
    return chatService.getSessionKey(ctx?.tabId, ctx?.url);
  },

  getCurrentMessages: () => {
    const key = get().getCurrentSessionKey();
    return get().sessions[key] || [];
  },

  loadPageContext: async (forceRefresh = false) => {
    set({ isLoadingContext: true, contextError: null });

    try {
      const context = forceRefresh
        ? await pageContextService.refreshContext()
        : await pageContextService.extractContextFromActiveTab();

      set({
        pageContext: context,
        isLoadingContext: false,
        contextError: context.isRestricted ? context.restrictionReason || 'Restricted page' : null,
      });

      // Synchronize existing session messages from chat service if available
      const key = chatService.getSessionKey(context.tabId, context.url);
      const existing = chatService.getSessionMessages(context.tabId, context.url);
      if (existing.length > 0 && !get().sessions[key]) {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [key]: existing,
          },
        }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to extract page context.';
      set({
        isLoadingContext: false,
        contextError: message,
      });
    }
  },

  sendMessage: async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || get().isGenerating) return;

    // Ensure page context is available
    let ctx = get().pageContext;
    if (!ctx) {
      await get().loadPageContext();
      ctx = get().pageContext;
    }

    if (!ctx) {
      throw new Error('Page context is unavailable.');
    }

    const sessionKey = get().getCurrentSessionKey();
    const currentMessages = get().sessions[sessionKey] || [];

    // 1. User Message
    const userMsgId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
      status: 'complete',
    };

    // Check for explicit memory instruction
    try {
      const memoryIntent = await memoryService.detectMemoryIntent(trimmed);
      if (memoryIntent.proposal) {
        set({ pendingMemoryProposal: memoryIntent.proposal });
      }
    } catch {
      // Non-blocking
    }

    // 2. Assistant Placeholder Message
    const assistantMsgId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      status: 'streaming',
    };

    // Update session state
    const newMessages = [...currentMessages, userMessage, assistantPlaceholder];
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionKey]: newMessages,
      },
      isGenerating: true,
      activeStreamText: '',
      activeMessageId: assistantMsgId,
    }));

    // Record in chatService
    chatService.appendMessage(ctx.tabId, ctx.url, userMessage);

    // Setup abort controller for cancellation
    const controller = new AbortController();
    set({ currentAbortController: controller });

    const language = useSettingsStore.getState().settings.language;

    try {
      const result = await chatService.sendQuestion({
        question: trimmed,
        pageContext: ctx,
        language,
        signal: controller.signal,
        onChunk: (_chunk, fullText) => {
          set({ activeStreamText: fullText });
        },
      });

      // Update assistant message with completed result
      const finalizedAssistantMessage: ChatMessage = {
        ...result.message,
        id: assistantMsgId,
        content: result.message.content || get().activeStreamText,
      };

      chatService.appendMessage(ctx.tabId, ctx.url, finalizedAssistantMessage);

      set((state) => {
        const msgs = (state.sessions[sessionKey] || []).map((m) =>
          m.id === assistantMsgId ? finalizedAssistantMessage : m
        );
        return {
          sessions: {
            ...state.sessions,
            [sessionKey]: msgs,
          },
          isGenerating: false,
          activeStreamText: '',
          activeMessageId: null,
          currentAbortController: null,
        };
      });
    } catch (err: unknown) {
      const isAborted = controller.signal.aborted;
      const errorMsg = err instanceof Error ? err.message : 'Error generating response';

      const preservedText = get().activeStreamText;

      const failedOrInterruptedMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'model',
        content: preservedText,
        timestamp: Date.now(),
        status: isAborted ? 'interrupted' : 'error',
        error: isAborted ? undefined : errorMsg,
      };

      chatService.appendMessage(ctx.tabId, ctx.url, failedOrInterruptedMessage);

      set((state) => {
        const msgs = (state.sessions[sessionKey] || []).map((m) =>
          m.id === assistantMsgId ? failedOrInterruptedMessage : m
        );
        return {
          sessions: {
            ...state.sessions,
            [sessionKey]: msgs,
          },
          isGenerating: false,
          activeStreamText: '',
          activeMessageId: null,
          currentAbortController: null,
        };
      });
    }
  },

  stopGeneration: () => {
    const controller = get().currentAbortController;
    if (controller) {
      controller.abort();
    }

    const sessionKey = get().getCurrentSessionKey();
    const activeId = get().activeMessageId;
    const preservedText = get().activeStreamText;

    if (activeId) {
      set((state) => {
        const msgs = (state.sessions[sessionKey] || []).map((m) =>
          m.id === activeId ? { ...m, content: preservedText, status: 'interrupted' as const } : m
        );
        return {
          sessions: {
            ...state.sessions,
            [sessionKey]: msgs,
          },
          isGenerating: false,
          activeStreamText: '',
          activeMessageId: null,
          currentAbortController: null,
        };
      });
    } else {
      set({
        isGenerating: false,
        activeStreamText: '',
        activeMessageId: null,
        currentAbortController: null,
      });
    }
  },

  clearCurrentConversation: () => {
    const ctx = get().pageContext;
    const sessionKey = get().getCurrentSessionKey();

    chatService.clearSession(ctx?.tabId, ctx?.url);

    set((state) => {
      const nextSessions = { ...state.sessions };
      delete nextSessions[sessionKey];
      return { sessions: nextSessions };
    });
  },

  retryLastMessage: async () => {
    const sessionKey = get().getCurrentSessionKey();
    const messages = get().sessions[sessionKey] || [];
    if (messages.length === 0) return;

    // Find the last user message
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const lastQuestion = messages[lastUserIndex].content;

    // Prune the last user message and any subsequent assistant message
    const pruned = messages.slice(0, lastUserIndex);
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionKey]: pruned,
      },
    }));

    // Re-send the question
    await get().sendMessage(lastQuestion);
  },

  appendCompletedTurn: (userText: string, assistantText: string) => {
    const ctx = get().pageContext;
    const sessionKey = get().getCurrentSessionKey();
    const currentMessages = get().sessions[sessionKey] || [];

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      status: 'complete',
    };

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'model',
      content: assistantText,
      timestamp: Date.now() + 1,
      status: 'complete',
      isGrounded: true,
    };

    const newMessages = [...currentMessages, userMessage, assistantMessage];
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionKey]: newMessages,
      },
    }));

    if (ctx) {
      chatService.appendMessage(ctx.tabId, ctx.url, userMessage);
      chatService.appendMessage(ctx.tabId, ctx.url, assistantMessage);
    }
  },

  approveMemoryProposal: async (proposal?: MemoryProposal) => {
    const target = proposal || get().pendingMemoryProposal;
    if (!target) return;
    try {
      await memoryService.approveProposal(target);
      set({ pendingMemoryProposal: null });
    } catch (err) {
      console.warn('[Sahayak Chat] Failed to approve memory proposal:', err);
    }
  },

  rejectMemoryProposal: () => {
    set({ pendingMemoryProposal: null });
  },
}));

export default useChatStore;
