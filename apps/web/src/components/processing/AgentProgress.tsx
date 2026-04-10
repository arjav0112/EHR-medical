'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'pending' | 'running' | 'complete' | 'error';

interface AgentNode {
  key: string;
  label: string;
  sublabel: string;
  statusLabel: { pending: string; running: string; complete: string; error: string };
}

interface AgentProgressProps {
  sessionId: string;
  live?: boolean;
  mockStatuses?: Record<string, AgentStatus>;
  onComplete?: () => void;
}

// ─── Agent definitions ────────────────────────────────────────────────────────

const AGENTS: AgentNode[] = [
  {
    key: 'transcript_quality',
    label: 'Transcript quality',
    sublabel: 'Scoring clarity & completeness',
    statusLabel: { pending: 'Queued', running: 'Analyzing transcript…', complete: 'Complete', error: 'Failed' },
  },
  {
    key: 'soap',
    label: 'SOAP note',
    sublabel: 'Drafting clinical documentation',
    statusLabel: { pending: 'Queued', running: 'Writing note…', complete: 'Complete', error: 'Failed' },
  },
  {
    key: 'risk',
    label: 'Risk analysis',
    sublabel: 'Detecting safety concerns',
    statusLabel: { pending: 'Queued', running: 'Scanning flags…', complete: 'Complete', error: 'Failed' },
  },
  {
    key: 'dsm',
    label: 'DSM-5 diagnosis',
    sublabel: 'Matching diagnostic criteria',
    statusLabel: { pending: 'Queued', running: 'Classifying…', complete: 'Complete', error: 'Failed' },
  },
  {
    key: 'plan',
    label: 'Treatment plan',
    sublabel: 'Building care recommendations',
    statusLabel: { pending: 'Queued', running: 'Planning…', complete: 'Complete', error: 'Failed' },
  },
  {
    key: 'hallucination_guard',
    label: 'Hallucination guard',
    sublabel: 'Auditing AI outputs against transcript',
    statusLabel: { pending: 'Queued', running: 'Verifying grounding…', complete: 'Verified', error: 'Failed' },
  },
];

// ─── Pipeline step ───────────────────────────────────────────────────────────

function PipelineStep({
  agent,
  status,
  isLast,
  index,
}: {
  agent: AgentNode;
  status: AgentStatus;
  isLast: boolean;
  index: number;
}) {
  const isDone = status === 'complete';
  const isRunning = status === 'running';
  const isError = status === 'error';

  return (
    <div
      className="flex gap-5 animate-in fade-in slide-in-from-left-4"
      style={{ animationDelay: `${index * 80}ms`, animationDuration: '500ms', animationFillMode: 'both' }}
    >
      {/* Pipe column */}
      <div className="flex flex-col items-center w-9 flex-shrink-0">
        {/* Node dot */}
        <div
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 border ${isDone
              ? 'bg-green-600 border-green-600'
              : isRunning
                ? 'bg-green-50 border-green-300'
                : isError
                  ? 'bg-red-50 border-red-300'
                  : 'bg-gray-50 border-gray-200'
            }`}
        >
          {isDone && (
            <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {isRunning && (
            <>
              <div className="absolute inset-0 rounded-xl bg-green-300 animate-ping opacity-30" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-600 animate-pulse" />
            </>
          )}
          {isError && <span className="text-red-500 text-[13px] font-bold">!</span>}
          {status === 'pending' && <div className="w-2 h-2 rounded-full bg-gray-300" />}
        </div>

        {/* Connector */}
        {!isLast && (
          <div className="relative w-[2px] flex-1 min-h-[28px] overflow-hidden rounded-full bg-gray-100 my-1.5">
            <div
              className="absolute top-0 left-0 right-0 rounded-full transition-all duration-700 ease-in-out"
              style={{
                height: isDone ? '100%' : '0%',
                background: isDone ? '#16a34a' : 'transparent',
              }}
            />
            {isRunning && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(to bottom, transparent, #16a34a 40%, #16a34a 60%, transparent)',
                  animation: 'flow 1.2s linear infinite',
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`pb-6 ${isLast ? 'pb-0' : ''} pt-1.5`}>
        <p className={`text-[14px] font-semibold leading-tight transition-colors duration-500 ${isDone ? 'text-gray-700' : isRunning ? 'text-gray-900' : 'text-gray-400'}`}>
          {agent.label}
        </p>
        <p className={`text-[12px] mt-0.5 transition-colors duration-500 ${isDone ? 'text-green-600' : isRunning ? 'text-green-600' : isError ? 'text-red-500' : 'text-gray-400'
          }`}>
          {agent.statusLabel[status]}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgentProgress({ sessionId, live = true, mockStatuses, onComplete }: AgentProgressProps) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>(
    mockStatuses ?? Object.fromEntries(AGENTS.map((a) => [a.key, 'pending']))
  );
  const [hasError, setHasError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectedRef = useRef(false);

  // Sync mockStatuses when preview state changes
  useEffect(() => {
    if (!live && mockStatuses) setStatuses(mockStatuses);
  }, [live, mockStatuses]);

  // Auto-animation when live=false and no mockStatuses (production loading overlay)
  useEffect(() => {
    if (live || mockStatuses) return;

    const agentKeys = AGENTS.map((a) => a.key);
    let step = 0;

    const tick = () => {
      step++;
      setStatuses(() => {
        const next: Record<string, AgentStatus> = {};
        agentKeys.forEach((key, i) => {
          if (step > i + 1) next[key] = 'complete';
          else if (step === i + 1) next[key] = 'running';
          else next[key] = 'pending';
        });
        return next;
      });

      // Loop back after all complete + brief pause
      if (step > agentKeys.length + 1) {
        step = 0;
        setStatuses(Object.fromEntries(agentKeys.map((k) => [k, 'pending'])));
      }
    };

    const id = setInterval(tick, 2000);
    // Kick off the first step immediately
    tick();
    return () => clearInterval(id);
  }, [live, mockStatuses]);

  useEffect(() => {
    if (!live) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/status`);
        if (!res.ok) return;
        const data = await res.json() as {
          agentStatuses: Record<string, AgentStatus>;
          complete: boolean;
          error?: string;
        };

        setStatuses(data.agentStatuses);

        if (data.error) {
          setHasError(true);
          clearInterval(intervalRef.current!);
        }

        if (data.complete && !redirectedRef.current) {
          redirectedRef.current = true;
          clearInterval(intervalRef.current!);
          setTimeout(() => {
            onComplete?.();
            router.push(`/session/${sessionId}/review`);
          }, 1000);
        }
      } catch {
        // network error — keep polling
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => clearInterval(intervalRef.current!);
  }, [sessionId, live, router, onComplete]);

  const completedCount = AGENTS.filter((a) => statuses[a.key] === 'complete').length;
  const allDone = completedCount === AGENTS.length && !hasError;
  const progressPct = Math.round((completedCount / AGENTS.length) * 100);

  return (
    <>
      {/* ── Pill navbar — matching home page ── */}
      <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
        <div className="w-full max-w-[860px] bg-white rounded-full shadow-[0_2px_20px_rgba(0,0,0,0.10)] border border-gray-100 px-5 h-[58px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <span className="text-[16px] font-bold text-gray-900 tracking-tight">EHR Copilot</span>
          </Link>

          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-gray-400 font-medium">New Session</span>
            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-semibold text-green-600">Processing</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session</span>
            <span className="text-[11px] font-mono font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full truncate max-w-[160px]">
              {sessionId}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="min-h-screen flex items-center justify-center px-6 pt-24" style={{ background: '#f8faf8' }}>

        <div className="w-full max-w-[520px] animate-in fade-in slide-in-from-bottom-6 duration-700">

          {/* ── Center card ── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>

            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-gray-100">
              {/* Badge */}
              <div className="flex justify-center mb-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white shadow-sm">
                  <span className="text-[13px] font-bold text-gray-800">✦</span>
                  <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-[0.1em]">Processing</span>
                </div>
              </div>

              <h2 className="text-[24px] font-bold text-gray-900 text-center leading-tight mb-2">
                Running Clinical Agents
              </h2>
              <p className="text-[13px] text-gray-500 text-center leading-relaxed">
                This usually takes 15–30 seconds. Sit tight.
              </p>

              {/* Progress bar */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Progress</span>
                  <span className="text-[11px] font-bold text-gray-500">{completedCount}/{AGENTS.length}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-in-out"
                    style={{
                      width: `${progressPct}%`,
                      background: allDone
                        ? '#16a34a'
                        : 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Pipeline steps */}
            <div className="px-8 py-6">
              {AGENTS.map((agent, i) => (
                <PipelineStep
                  key={agent.key}
                  agent={agent}
                  status={statuses[agent.key] ?? 'pending'}
                  isLast={i === AGENTS.length - 1}
                  index={i}
                />
              ))}
            </div>

            {/* Status footer */}
            {(hasError || allDone) && (
              <div className="px-8 pb-6">
                {hasError && (
                  <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[13px] text-red-600 font-medium">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    An agent encountered an error. Please check the transcript and try again.
                  </div>
                )}
                {allDone && (
                  <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-[13px] text-green-700 font-semibold">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    All agents complete — redirecting to review…
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Trust signals below card */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-[12px] text-gray-400 mt-6">
            {['HIPAA Compliant', 'End-to-End Encrypted', 'SOC 2 Ready'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

export default AgentProgress;
