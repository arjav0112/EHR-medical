'use client';

import { useEffect, useRef, useState } from 'react';

interface StreamedResult {
  content: string;
  confidence: number;
  provenanceTag: string;
}

interface StreamingRevisionProps {
  // POST body to send
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
        setError('Revision failed — try again');
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
      readerRef.current?.cancel().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const handleStop = () => {
    abortRef.current?.abort();
    readerRef.current?.cancel().catch(() => {});
    onStop();
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-[#EF4444] px-1">
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        {error}
      </div>
    );
  }

  if (!isActive && !tokens) return null;

  return (
    <div className="space-y-2">
      {/* Streamed content */}
      <div className="bg-[#FAFAFA] border border-[#E0DDD6] rounded-xl p-4 text-[14px] text-[#1A1A1A] leading-[1.7] min-h-[80px]">
        <span>{tokens}</span>
        {isActive && !done && (
          <span className="inline-block w-[9px] h-[14px] bg-[#6c63ff] ml-0.5 animate-pulse align-text-bottom" />
        )}
      </div>

      {/* Stop button while streaming */}
      {isActive && !done && (
        <div className="flex justify-end">
          <button
            onClick={handleStop}
            className="text-[13px] font-medium text-[#EF4444] border border-[#EF4444] px-4 py-1.5 rounded-full hover:bg-red-50 transition-colors"
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
}
