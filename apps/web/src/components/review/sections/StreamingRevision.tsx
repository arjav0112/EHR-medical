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

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      <div className="glass-card bg-navy-900/50 border-white/10 p-6 shadow-inner relative group">
        <div className="absolute top-0 left-0 w-1 h-full bg-neon-500/50 rounded-full" />
        <p className="text-[15px] text-white leading-relaxed font-serif whitespace-pre-wrap">
          {tokens}
          {isActive && !done && (
            <span className="inline-block w-2.5 h-[1.2em] bg-neon-500 ml-1 animate-pulse shadow-[0_0_10px_rgba(190,242,100,0.8)] align-middle" />
          )}
        </p>
      </div>

      {isActive && !done && (
        <div className="flex justify-end pr-2">
          <button
            onClick={handleStop}
            className="group flex items-center gap-3 text-[10px] font-bold text-red-400 border border-red-500/30 px-5 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all uppercase tracking-[0.2em]"
          >
            <div className="w-3 h-3 bg-red-400 group-hover:bg-white" />
            Interrupt Protocol
          </button>
        </div>
      )}
    </div>
  );
}
