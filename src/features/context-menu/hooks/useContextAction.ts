/**
 * useContextAction Hook
 * Coordinates background context-menu triggers, Gemini AI action execution,
 * clipboard copying, and handoff to Page Chat.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ContextActionPayload,
  ContextActionResult,
  PENDING_CONTEXT_ACTION_KEY,
} from '../types/context-menu.types';
import { contextActionService } from '../services/context-action.service';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useChatStore } from '@/sidepanel/store/useChatStore';
import { useNavigationStore } from '@/store/useNavigationStore';

export function useContextAction() {
  const [payload, setPayload] = useState<ContextActionPayload | null>(null);
  const [result, setResult] = useState<ContextActionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { settings } = useSettingsStore();
  const { sendMessage, appendCompletedTurn } = useChatStore();
  const { setActiveTab } = useNavigationStore();

  /**
   * Executes a given context action payload.
   */
  const processPayload = useCallback(
    async (incomingPayload: ContextActionPayload) => {
      if (!incomingPayload) return;

      // Handle 'ask' action: Forward directly to Page Chat
      if (incomingPayload.actionType === 'ask') {
        setActiveTab('chat');
        const question = `Regarding this text from the page:\n"${incomingPayload.selectionText}"\n\nExplain or analyze this passage.`;
        sendMessage(question);
        return;
      }

      setPayload(incomingPayload);
      setIsProcessing(true);
      setStreamingText('');
      setResult(null);

      // Setup abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const actionResult = await contextActionService.executeAction({
          payload: incomingPayload,
          language: settings.language,
          signal: controller.signal,
          onChunk: (_chunk, fullText) => {
            setStreamingText(fullText);
          },
        });

        setResult(actionResult);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Action execution failed.';
        setResult({
          id: incomingPayload.id,
          actionType: incomingPayload.actionType,
          selectionText: incomingPayload.selectionText,
          resultText: '',
          status: 'error',
          error: errorMsg,
          timestamp: Date.now(),
          language: settings.language,
        });
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [settings.language, sendMessage, setActiveTab]
  );

  /**
   * Check for pending context actions in chrome.storage on mount and listen to messages.
   */
  useEffect(() => {
    // 1. Initial storage check
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get([PENDING_CONTEXT_ACTION_KEY], (res) => {
        const pending = res?.[PENDING_CONTEXT_ACTION_KEY] as ContextActionPayload | undefined;

        if (pending && pending.selectionText) {
          chrome.storage.local.remove([PENDING_CONTEXT_ACTION_KEY]);
          processPayload(pending);
        }
      });
    }

    // 2. Runtime message listener for live triggers
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      const messageListener = (message: { type?: string; payload?: ContextActionPayload }) => {
        if (message?.type === 'CONTEXT_MENU_ACTION' && message.payload) {
          processPayload(message.payload);
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
      return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
      };
    }
  }, [processPayload]);

  /**
   * Retries the current action.
   */
  const retryAction = useCallback(async () => {
    if (payload) {
      await processPayload(payload);
    }
  }, [payload, processPayload]);

  /**
   * Copies the result text to clipboard with feedback timer.
   */
  const copyResult = useCallback(async (): Promise<boolean> => {
    const textToCopy = result?.resultText || streamingText;
    if (!textToCopy) return false;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  }, [result?.resultText, streamingText]);

  /**
   * Continues the conversation in Page Chat by injecting this turn into the chat thread.
   */
  const continueInPageChat = useCallback(() => {
    if (!payload || !result || !result.resultText) return;

    const actionLabels: Record<string, string> = {
      explain: 'Explain this passage',
      summarize: 'Summarize this passage',
      translate: 'Translate this passage',
      rewrite: 'Rewrite this passage',
    };

    const userQuery = `${actionLabels[payload.actionType] || 'Analyze selection'}:\n"${payload.selectionText}"`;
    const assistantReply = result.resultText;

    appendCompletedTurn(userQuery, assistantReply);
    setActiveTab('chat');

    // Dismiss context action card
    setPayload(null);
    setResult(null);
    setStreamingText('');
  }, [payload, result, appendCompletedTurn, setActiveTab]);

  /**
   * Dismisses the active context action card.
   */
  const dismissAction = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setPayload(null);
    setResult(null);
    setStreamingText('');
    setIsProcessing(false);
  }, []);

  return {
    payload,
    result,
    isProcessing,
    streamingText,
    copied,
    processPayload,
    retryAction,
    copyResult,
    continueInPageChat,
    dismissAction,
  };
}

export default useContextAction;
