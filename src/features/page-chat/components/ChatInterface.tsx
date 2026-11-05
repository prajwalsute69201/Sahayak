import React, { useRef, useEffect } from 'react';
import { usePageChat } from '../hooks/usePageChat';
import { useNavigationStore } from '@/store/useNavigationStore';
import PageContextHeader from './PageContextHeader';
import ChatMessage from './ChatMessage';
import StreamingMessage from './StreamingMessage';
import ChatInput from './ChatInput';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { KeyRound, Sparkles, MessageSquareQuote } from 'lucide-react';
import { MemoryApprovalCard } from '@/features/memory/components/MemoryApprovalCard';

export const ChatInterface: React.FC = () => {
  const {
    pageContext,
    isLoadingContext,
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
  } = usePageChat();

  const { setActiveTab } = useNavigationStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming chunks
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeStreamText]);

  const isRestricted = Boolean(pageContext?.isRestricted);

  return (
    <div className="flex h-full w-full flex-col gap-2.5">
      {/* 1. Header with Page Context & Metadata */}
      <PageContextHeader
        pageContext={pageContext}
        isLoading={isLoadingContext}
        onRefresh={refreshContext}
        onClear={clearCurrentConversation}
        hasMessages={messages.length > 0}
      />

      {/* API Key Missing Alert */}
      {!isConfigured && (
        <Card className="border-amber-200 bg-amber-50 p-2.5 text-left dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
                Gemini API Key required to chat with pages.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('settings')}
              className="h-6 text-[11px] px-2 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200"
            >
              Add Key
            </Button>
          </div>
        </Card>
      )}

      {/* 2. Chat Messages Viewport */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-[220px]">
        {/* Empty State with Suggested Questions */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 px-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 shadow-xs mb-2.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Grounded Page Chat
            </h3>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px] leading-relaxed">
              Ask questions about this {pageContext?.contentType || 'page'}. Answers are strictly
              grounded in its actual content.
            </p>

            {/* Quick Starter Question Pills */}
            {suggestedQuestions.length > 0 && !isRestricted && (
              <div className="mt-4 flex flex-col gap-1.5 w-full">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-left px-1">
                  Suggested Questions
                </span>
                <div className="flex flex-col gap-1.5">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={!isConfigured || isGenerating}
                      onClick={() => sendMessage(question)}
                      className="group flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white p-2 text-left text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/30 transition-all shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <MessageSquareQuote className="h-3.5 w-3.5 text-blue-500 shrink-0 group-hover:scale-105 transition-transform" />
                      <span className="truncate">{question}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Messages */}
        {messages.map((message) => {
          // If this message is the currently active streaming one, render StreamingMessage instead
          if (message.id === activeMessageId && isGenerating) {
            return (
              <StreamingMessage
                key={message.id}
                content={activeStreamText}
                onStop={stopGeneration}
              />
            );
          }

          return <ChatMessage key={message.id} message={message} onRetry={retryLastMessage} />;
        })}

        {/* Pending HITL Memory Proposal Card */}
        {pendingMemoryProposal && (
          <MemoryApprovalCard
            proposal={pendingMemoryProposal}
            onApprove={approveMemoryProposal}
            onReject={rejectMemoryProposal}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Chat Input Box */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopGeneration}
        isGenerating={isGenerating}
        disabled={!isConfigured || isRestricted}
      />
    </div>
  );
};

export default ChatInterface;
