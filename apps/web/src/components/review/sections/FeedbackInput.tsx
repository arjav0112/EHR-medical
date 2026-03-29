'use client';

import { useRef, useEffect, KeyboardEvent } from 'react';

interface FeedbackInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
}

const MAX_CHARS = 600;

export function FeedbackInput({
  value,
  onChange,
  onSubmit,
  isStreaming,
}: FeedbackInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autogrow
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isStreaming && value.trim()) onSubmit();
    }
  };

  const remaining = MAX_CHARS - value.length;

  return (
    <div className="border border-[#E0DDD6] rounded-xl bg-white overflow-hidden">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={handleKeyDown}
        disabled={isStreaming}
        placeholder="Describe what needs changing..."
        rows={2}
        className="w-full resize-none px-4 pt-3 pb-2 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] leading-relaxed focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
      />
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        {/* Shortcut hint */}
        <span className="text-[11px] text-[#9CA3AF]">
          {navigator?.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to send
        </span>
        <div className="flex items-center gap-3">
          <span className={`text-[12px] ${remaining < 60 ? 'text-[#EF4444]' : 'text-[#9CA3AF]'}`}>
            {remaining}
          </span>
          <button
            onClick={onSubmit}
            disabled={isStreaming || !value.trim()}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[#6c63ff] text-white px-4 py-1.5 rounded-full hover:bg-[#5a52d5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>Regenerate →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
