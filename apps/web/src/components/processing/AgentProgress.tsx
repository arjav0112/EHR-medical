'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
];

// ─── Water fill step ──────────────────────────────────────────────────────────

function PipelineStep({
  agent,
  status,
  isLast,
}: {
  agent: AgentNode;
  status: AgentStatus;
  isLast: boolean;
}) {
  const isDone = status === 'complete';
  const isRunning = status === 'running';
  const isError = status === 'error';

  const dotColor = isDone
    ? 'bg-emerald-500'
    : isRunning
    ? 'bg-violet-500'
    : isError
    ? 'bg-red-500'
    : 'bg-gray-200';

  const labelColor = isDone
    ? 'text-emerald-600'
    : isRunning
    ? 'text-violet-600'
    : isError
    ? 'text-red-500'
    : 'text-gray-400';

  return (
    <div className="flex gap-4">
      {/* Pipe column */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        {/* Node dot */}
        <div className={`relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-700 ${dotColor}`}>
          {isDone && (
            <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {isRunning && (
            <>
              <div className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-40" />
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            </>
          )}
          {isError && <span className="text-white text-[13px] font-bold">!</span>}
          {status === 'pending' && <div className="w-2 h-2 rounded-full bg-gray-300" />}
        </div>

        {/* Connector pipe */}
        {!isLast && (
          <div className="relative w-[3px] flex-1 min-h-[36px] overflow-hidden rounded-full bg-gray-100 my-1">
            {/* Water fill — fills from top if this step is done */}
            <div
              className="absolute top-0 left-0 right-0 rounded-full transition-all duration-1000 ease-in-out"
              style={{
                height: isDone ? '100%' : '0%',
                background: isDone
                  ? 'linear-gradient(to bottom, #a78bfa, #10b981)'
                  : 'transparent',
              }}
            />
            {/* Flowing shimmer when currently running */}
            {isRunning && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(to bottom, transparent, #a78bfa 40%, #a78bfa 60%, transparent)',
                  animation: 'flow 1.2s linear infinite',
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`pb-8 ${isLast ? 'pb-0' : ''}`}>
        <p className={`text-[14px] font-semibold leading-tight transition-colors duration-500 ${isDone ? 'text-gray-700' : isRunning ? 'text-gray-900' : 'text-gray-400'}`}>
          {agent.label}
        </p>
        <p className={`text-[12px] mt-0.5 transition-colors duration-500 ${labelColor}`}>
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
      {/* Pill navbar — matches review page design */}
      <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
        <div className="w-full max-w-[900px] bg-white rounded-full shadow-[0_2px_20px_rgba(0,0,0,0.10)] border border-gray-100 px-5 h-[58px] flex items-center justify-between">
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
            <span className="font-semibold text-violet-600">Processing</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session</span>
            <span className="text-[11px] font-mono font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full truncate max-w-[160px]">
              {sessionId}
            </span>
          </div>
        </div>
      </header>


      <main className="h-screen flex items-center justify-center px-6 relative pt-14">
        {/* Fixed background — always covers full viewport */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            backgroundImage: 'url(/plitvice-bg-wide.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Soft overlay */}
        <div className="fixed inset-0 bg-white/15" style={{ zIndex: 1 }} />

        <div className="relative z-10 w-full max-w-5xl flex items-stretch gap-10 bg-white border border-gray-100 rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.07)] overflow-hidden">

          {/* ── Left: Avatar panel ─────────────────────────────────────── */}
          <div className="w-[340px] flex-shrink-0 bg-gradient-to-b from-violet-50 to-emerald-50 flex flex-col items-center justify-center py-14 px-10 gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-violet-200/40 blur-2xl scale-125" />
              <Image
                src="/doctor-avatar.png"
                alt="Clinical AI"
                width={180}
                height={180}
                className="relative rounded-2xl object-cover"
                priority
              />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-gray-800">EHR Copilot</p>
              <p className="text-[12px] text-gray-500 mt-1">Clinical AI is working…</p>
            </div>

            {/* Mini progress ring */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-in-out"
                  style={{
                    width: `${progressPct}%`,
                    background: 'linear-gradient(to right, #a78bfa, #10b981)',
                  }}
                />
              </div>
              <p className="text-[11px] font-mono text-gray-400">{completedCount} / {AGENTS.length} agents complete</p>
            </div>
          </div>

          {/* ── Right: Pipeline progress ────────────────────────────────── */}
          <div className="flex-1 py-10 pr-10">
            <div className="mb-7">
              <p className="text-[11px] font-bold text-violet-500 uppercase tracking-[0.2em] mb-1">Processing</p>
              <h2 className="text-[22px] font-bold text-gray-900 leading-tight">Running clinical agents</h2>
              <p className="text-[13px] text-gray-400 mt-1">This usually takes 15–30 seconds.</p>
            </div>

            {/* Pipeline */}
            <div className="mt-6">
              {AGENTS.map((agent, i) => (
                <PipelineStep
                  key={agent.key}
                  agent={agent}
                  status={statuses[agent.key] ?? 'pending'}
                  isLast={i === AGENTS.length - 1}
                />
              ))}
            </div>

            {/* States */}
            {hasError && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-600 font-medium">
                An agent encountered an error. Please check the transcript and try again.
              </div>
            )}
            {allDone && (
              <div className="mt-6 flex items-center gap-2.5 text-[13px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                All agents complete — redirecting to review…
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default AgentProgress;
