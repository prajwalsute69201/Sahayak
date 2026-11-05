import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isGenerating,
  disabled = false,
  placeholder = 'Ask a question about this page...',
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to 100px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isGenerating) {
      onStop();
      return;
    }

    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setInput('');

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="relative flex items-end gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 transition-all">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? 'Page chat unavailable on this URL.' : placeholder}
        rows={1}
        className={cn(
          'flex-1 resize-none bg-transparent px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-500 max-h-[100px] leading-relaxed',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={(!input.trim() && !isGenerating) || (disabled && !isGenerating)}
        aria-label={isGenerating ? 'Stop Generation' : 'Send Question'}
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all shadow-2xs',
          isGenerating
            ? 'bg-red-500 text-white hover:bg-red-600'
            : input.trim() && !disabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
        )}
      >
        {isGenerating ? (
          <Square className="h-3.5 w-3.5 fill-current" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};

export default ChatInput;
