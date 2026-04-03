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
    <div className="glass-card bg-navy-900/50 border-white/10 focus-within:border-neon-500/50 focus-within:shadow-[0_0_30px_rgba(190,242,100,0.05)] transition-all duration-500 group overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={handleKeyDown}
        disabled={isStreaming}
        placeholder="Input revision parameters (e.g., 'more emphasis on fatigue', 'format as bullet points')..."
        rows={2}
        className="w-full resize-none px-6 pt-5 pb-3 text-[15px] font-serif text-white placeholder-navy-500 leading-relaxed focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-transparent overflow-hidden"
      />
      
      <div className="flex items-center justify-between px-6 pb-4 pt-1">
        {/* Shortcut hint */}
        <div className="flex items-center gap-2 opacity-40 group-focus-within:opacity-100 transition-opacity">
          <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[9px] font-bold text-navy-400 font-mono">
             {typeof window !== 'undefined' && window.navigator?.platform?.includes('Mac') ? 'CMD' : 'CTRL'}
          </kbd>
          <span className="text-[10px] text-navy-500 font-bold uppercase tracking-widest font-sans">
            + ENTER TO INITIALIZE
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span className={`text-[11px] font-mono font-bold tracking-widest ${remaining < 60 ? 'text-red-500' : 'text-navy-500'}`}>
            {remaining} <span className="opacity-40">/ {MAX_CHARS}</span>
          </span>
          
          <button
            onClick={onSubmit}
            disabled={isStreaming || !value.trim()}
            className="group/btn relative inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] bg-neon-500 text-navy-950 px-6 py-2.5 rounded-xl hover:shadow-[0_0_20px_rgba(190,242,100,0.3)] transition-all disabled:opacity-20 disabled:cursor-not-allowed overflow-hidden font-sans"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
            
            {isStreaming ? (
              <>
                <span className="w-3 h-3 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 group-hover/btn:animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m13 2-2 2.5h3L12 7h3l-4 5h5l-4 7" />
                </svg>
                Initialize Revision
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
