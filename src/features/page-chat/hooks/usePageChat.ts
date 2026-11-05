/**
 * usePageChat Hook
 * React hook connecting UI components to page context, chat messages,
 * and streaming state.
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useChatStore } from '@/sidepanel/store/useChatStore';
import { useNavigationStore } from '@/store/useNavigationStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { contextRetrievalService } from '../services/context-retrieval.service';

export function usePageChat() {
  const {
    pageContext,
    isLoadingContext,
    contextError,
    sessions,
    isGenerating,
    activeStreamText,
    activeMessageId,
    pendingMemoryProposal,
    approveMemoryProposal,
    rejectMemoryProposal,
    loadPageContext,
    sendMessage,
    stopGeneration,
    clearCurrentConversation,
    retryLastMessage,
    getCurrentSessionKey,
  } = useChatStore();

  const { activePage } = useNavigationStore();
  const { settings } = useSettingsStore();

  const sessionKey = getCurrentSessionKey();
  const messages = useMemo(() => sessions[sessionKey] || [], [sessions, sessionKey]);

  // Load context on initial mount or when activePage URL changes
  useEffect(() => {
    loadPageContext();
  }, [activePage?.url, loadPageContext]);

  const refreshContext = useCallback(async () => {
    await loadPageContext(true);
  }, [loadPageContext]);

  // Suggested questions based on active page context
  const suggestedQuestions = useMemo(() => {
    if (!pageContext) return [];
    return contextRetrievalService.generateSuggestedQuestions(pageContext);
  }, [pageContext]);

  const isConfigured = Boolean(settings.geminiApiKey?.trim());

  return {
    pageContext,
    isLoadingContext,
    contextError,
    messages,
    isGenerating,
    activeStreamText,
    activeMessageId,
    isConfigured,
    suggestedQuestions,
    pendingMemoryProposal,
    approveMemoryProposal,
    rejectMemoryProposal,
    sendMessage,
    stopGeneration,
    clearCurrentConversation,
    retryLastMessage,
    refreshContext,
  };
}

export default usePageChat;
