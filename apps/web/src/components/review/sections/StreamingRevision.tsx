'use client';

import { useEffect, useRef, useState } from 'react';

interface StreamedResult {
  content: string;
  confidence: number;
  provenanceTag: string;
}

interface StreamingRevisionProps {
  requestBody: {
    section: string;
    currentDraft: string;
    feedback: string;
    approvedSections: Record<string, unknown>;
    transcript: string;
    patientContext: {
      age: number;
      gender: string;
      knownDiagnoses: string[];
      sessionType: string;
      currentMedications: string[];
    };
    currentRevisionRounds: number;
  };
  onComplete: (result: StreamedResult) => void;
  onStop: () => void;
  isActive: boolean;
}

export function StreamingRevision({
  requestBody,
  onComplete,
  onStop,
  isActive,
}: StreamingRevisionProps) {
  const [tokens, setTokens] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isActive) return;
    // Guard: don't fire if feedback is empty (race between state batches)
    if (!requestBody.feedback.trim()) return;

    let cancelled = false;
    const abort = new AbortController();
    abortRef.current = abort;
    setTokens('');
    setError(null);
    setDone(false);

    (async () => {
      try {
        const res = await fetch('/api/session/revise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abort.signal,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error((json as { message?: string }).message ?? `HTTP ${res.status}`);
        }
        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: StreamedResult | null = null;

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone || cancelled) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const raw = trimmed.slice(6);
            if (raw === '[DONE]') continue;
            try {
              const parsed = JSON.parse(raw) as {
                token?: string;
                content?: string;
                confidence?: number;
                provenanceTag?: string;
                done?: boolean;
              };
              if (parsed.token) {
                setTokens((prev) => prev + parsed.token);
              }
              if (parsed.done && parsed.content !== undefined) {
                finalResult = {
                  content: parsed.content,
                  confidence: parsed.confidence ?? 0.8,
                  provenanceTag: parsed.provenanceTag ?? 'ai_revised',
                };
              }
            } catch {
              // non-JSON line — ignore
            }
          }
        }

        if (!cancelled) {
          setDone(true);
          if (finalResult) onComplete(finalResult);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (msg === 'AbortError' || msg.includes('aborted')) return;
        setError('Revision failed — verify connection architecture');
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
      readerRef.current?.cancel().catch(() => {});
    };
  }, [isActive, requestBody, onComplete]);

  const handleStop = () => {
    abortRef.current?.abort();
    readerRef.current?.cancel().catch(() => {});
    onStop();
  };

  if (error) {
    return (
      <div className="flex items-center gap-3 glass-card bg-red-900/20 border-red-500/30 p-4 text-[13px] font-bold text-red-400 uppercase tracking-widest animate-in shake duration-500">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {error}
      </div>
    );
  }

  if (!isActive && !tokens) return null;

  // Thinking animation before first token arrives
  if (isActive && !tokens && !done) {
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-500">
        <div className="flex-1 bg-white border border-purple-100 rounded-2xl p-8 flex flex-col gap-6 shadow-sm">
          {/* Pulsing thinking header */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[11px] font-bold text-purple-500 uppercase tracking-widest">AI is thinking...</span>
          </div>
          {/* Skeleton lines */}
          <div className="space-y-3">
            <div className="h-3 bg-purple-50 rounded-full w-full animate-pulse" />
            <div className="h-3 bg-purple-50 rounded-full w-5/6 animate-pulse" style={{ animationDelay: '100ms' }} />
            <div className="h-3 bg-purple-50 rounded-full w-4/5 animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="h-3 bg-purple-50 rounded-full w-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="h-3 bg-purple-50 rounded-full w-3/4 animate-pulse" style={{ animationDelay: '250ms' }} />
          </div>
        </div>
        <div className="flex justify-end pr-2 mt-3">
          <button
            onClick={handleStop}
            className="flex items-center gap-2 text-[11px] font-bold text-red-400 border border-red-200 bg-white px-4 py-2 rounded-xl hover:bg-red-50 transition-all uppercase tracking-widest"
          >
            <div className="w-2.5 h-2.5 bg-red-400 rounded-sm" />
            Interrupt Protocol
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 animate-in fade-in duration-700">
      <div className="flex-1 min-h-0 bg-white border border-purple-200 rounded-2xl overflow-hidden flex flex-col shadow-sm relative">
        {/* Left accent bar */}
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-400 rounded-l-2xl" />
        <div className="flex-1 overflow-y-auto px-8 py-7 scrollbar-hide">
          <p className="text-[13.5px] text-slate-700 leading-relaxed font-sans font-normal whitespace-pre-wrap">
            {tokens}
            {isActive && !done && (
              <span className="inline-block w-[2px] h-[1.1em] bg-purple-500 ml-1 animate-pulse align-middle rounded-full" />
            )}
          </p>
        </div>
      </div>

      {isActive && !done && (
        <div className="flex justify-end flex-shrink-0">
          <button
            onClick={handleStop}
            className="flex items-center gap-2 text-[11px] font-bold text-red-400 border border-red-200 bg-white px-4 py-2 rounded-xl hover:bg-red-50 transition-all uppercase tracking-widest"
          >
            <div className="w-2.5 h-2.5 bg-red-400 rounded-sm" />
            Interrupt Protocol
          </button>
        </div>
      )}
    </div>
  );
}
