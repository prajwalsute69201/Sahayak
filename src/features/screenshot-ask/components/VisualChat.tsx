/**
 * Visual Chat Component
 * Main interactive container for Screenshot-and-Ask (Multimodal Vision).
 */

import React, { useRef, useEffect } from 'react';
import { useScreenshotAsk } from '../hooks/useScreenshotAsk';
import ScreenshotCapture from './ScreenshotCapture';
import ScreenshotPreview from './ScreenshotPreview';
import ScreenshotToolbar from './ScreenshotToolbar';
import VisualMessage from './VisualMessage';
import { ChatInput } from '@/features/page-chat/components/ChatInput';
import ErrorState from '@/components/common/ErrorState';
import { Eye } from 'lucide-react';

export const VisualChat: React.FC = () => {
  const {
    screenshot,
    messages,
    isCapturing,
    isProcessing,
    streamingText,
    error,
    warning,
    captureScreenshot,
    retakeScreenshot,
    removeScreenshot,
    clearChat,
    askQuestion,
    executePreset,
    stopGeneration,
    retryLast,
  } = useScreenshotAsk();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages update or streaming text arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // If no screenshot is captured yet, display capture entry screen
  if (!screenshot) {
    return (
      <div className="flex flex-col gap-3">
        <ScreenshotCapture onCapture={captureScreenshot} isCapturing={isCapturing} error={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 h-full">
      {/* 1. Screenshot Preview Drawer */}
      <ScreenshotPreview
        screenshot={screenshot}
        onRetake={retakeScreenshot}
        onRemove={removeScreenshot}
        isProcessing={isProcessing}
      />

      {/* Warning banner if optimized */}
      {warning && (
        <div className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
          {warning}
        </div>
      )}

      {/* 2. Preset Quick Inquiry Toolbar */}
      <ScreenshotToolbar
        onSelectPreset={executePreset}
        onClearChat={clearChat}
        disabled={isProcessing}
        hasMessages={messages.length > 0}
      />

      {/* 3. Messages Container */}
      <div className="flex flex-col gap-3 min-h-[180px] max-h-[340px] overflow-y-auto px-1 py-1 rounded-xl">
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500">
            <Eye className="h-8 w-8 mb-2 opacity-40 text-blue-500" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Screenshot loaded and ready
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
              Click a preset chip above or type any question below to inspect this image.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <VisualMessage key={msg.id} message={msg} />
        ))}

        {/* Live streaming message */}
        {isProcessing && streamingText && (
          <VisualMessage
            message={{
              id: 'streaming-active',
              role: 'model',
              text: streamingText,
              timestamp: Date.now(),
            }}
            isStreaming
          />
        )}

        {/* Generating spinner before first chunk */}
        {isProcessing && !streamingText && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-2 py-1">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            <span>Analyzing screenshot with Gemini Vision...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="my-1">
            <ErrorState title="Vision Request Failed" message={error} onRetry={retryLast} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Chat Input Box */}
      <div className="mt-auto pt-1">
        <ChatInput
          onSend={(q) => askQuestion(q)}
          onStop={stopGeneration}
          isGenerating={isProcessing}
          disabled={isProcessing}
          placeholder="Ask anything about what is shown in this screenshot..."
        />
      </div>
    </div>
  );
};

export default VisualChat;
