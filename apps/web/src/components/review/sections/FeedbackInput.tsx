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
  const isMac = typeof window !== 'undefined' && window.navigator?.platform?.includes('Mac');

  return (
    <div className="bg-white border-2 border-purple-200 rounded-2xl overflow-hidden focus-within:border-purple-400 focus-within:shadow-[0_0_0_4px_rgba(168,85,247,0.08)] transition-all duration-300">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={handleKeyDown}
        disabled={isStreaming}
        placeholder="Describe what to refine — e.g. 'add more detail on sleep symptoms', 'format plan as bullet points'..."
        rows={3}
        className="w-full resize-none px-6 pt-5 pb-3 text-[15px] text-gray-800 placeholder-gray-400 leading-relaxed focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
      />

      {/* Footer toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 rounded-md border border-gray-200 bg-white text-[10px] font-bold text-gray-500 font-mono shadow-sm">
            {isMac ? 'CMD' : 'CTRL'}
          </kbd>
          <span className="text-[11px] text-gray-500 font-medium">+ Enter to run</span>
        </div>

        <div className="flex items-center gap-4">
          <span className={`text-[12px] font-mono font-semibold ${remaining < 60 ? 'text-red-500' : 'text-gray-400'}`}>
            {remaining}<span className="opacity-50 font-normal"> / {MAX_CHARS}</span>
          </span>

          <button
            onClick={onSubmit}
            disabled={isStreaming || !value.trim()}
            className="inline-flex items-center gap-2 text-[12px] font-bold bg-purple-600 text-white px-5 py-2 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m13 2-2 2.5h3L12 7h3l-4 5h5l-4 7" />
                </svg>
                Run Refinement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
