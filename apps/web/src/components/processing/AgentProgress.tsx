'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'pending' | 'running' | 'complete' | 'error';

interface AgentNode {
  key: string;
  label: string;
  statusLabel: { pending: string; running: string; complete: string; error: string };
}

interface AgentProgressProps {
  sessionId: string;
  /** If true, poll /api/session/[sessionId]/status. If false, use `mockStatuses` for demo. */
  live?: boolean;
  /** Optional override statuses (for demo mode) */
  mockStatuses?: Record<string, AgentStatus>;
  onComplete?: () => void;
}

// ─── Agent definitions ────────────────────────────────────────────────────────

const AGENTS: AgentNode[] = [
  {
    key: 'transcript_quality',
    label: 'Transcript quality',
    statusLabel: {
      pending: 'Waiting...',
      running: 'Analyzing transcript...',
      complete: 'Complete',
      error: 'Error',
    },
  },
  {
    key: 'soap',
    label: 'SOAP note',
    statusLabel: {
      pending: 'Waiting...',
      running: 'Drafting clinical note...',
      complete: 'Complete',
      error: 'Error',
    },
  },
  {
    key: 'risk',
    label: 'Risk analysis',
    statusLabel: {
      pending: 'Waiting...',
      running: 'Scanning for risk flags...',
      complete: 'Complete',
      error: 'Error',
    },
  },
  {
    key: 'dsm',
    label: 'DSM-5 diagnosis',
    statusLabel: {
      pending: 'Waiting...',
      running: 'Matching diagnostic criteria...',
      complete: 'Complete',
      error: 'Error',
    },
  },
  {
    key: 'plan',
    label: 'Treatment plan',
    statusLabel: {
      pending: 'Waiting...',
      running: 'Building treatment plan...',
      complete: 'Complete',
      error: 'Error',
    },
  },
];

// ─── Node icon ────────────────────────────────────────────────────────────────

function NodeIcon({ status }: { status: AgentStatus }) {
  if (status === 'complete') {
    return (
      <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center flex-shrink-0 transition-all">
        <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="w-8 h-8 rounded-full bg-[#EF4444] flex items-center justify-center flex-shrink-0">
        <span className="text-white text-[14px] font-bold">✕</span>
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="relative flex-shrink-0">
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full bg-[#6c63ff] opacity-30 animate-ping" />
        <div className="w-8 h-8 rounded-full bg-[#6c63ff] flex items-center justify-center relative">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
        </div>
      </div>
    );
  }
  // pending
  return (
    <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex items-center justify-center flex-shrink-0">
      <div className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
    </div>
  );
}

// ─── Connector line ───────────────────────────────────────────────────────────

function Connector({ done }: { done: boolean }) {
  return (
    <div className="ml-4 w-px h-6 transition-colors duration-500" style={{ backgroundColor: done ? '#10B981' : '#E5E7EB' }} />
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

  return (
    <div className="bg-white border border-[#E0DDD6] rounded-2xl p-7 max-w-[420px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[12px] font-bold text-[#6c63ff] uppercase tracking-widest mb-1">
          Processing
        </p>
        <h2 className="text-[20px] font-bold text-[#1A1A1A]">Running clinical agents</h2>
        <p className="text-[13px] text-[#9CA3AF] mt-1">
          This usually takes 15–30 seconds.
        </p>
      </div>

      {/* Agent list */}
      <div>
        {AGENTS.map((agent, i) => {
          const status = statuses[agent.key] ?? 'pending';
          const isLast = i === AGENTS.length - 1;
          const prevDone = i === 0 || statuses[AGENTS[i - 1].key] === 'complete';

          return (
            <div key={agent.key}>
              <div className="flex items-center gap-3">
                <NodeIcon status={status} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1A1A1A] leading-none mb-0.5">
                    {agent.label}
                  </p>
                  <p className={`text-[12px] leading-none ${
                    status === 'running' ? 'text-[#6c63ff]' :
                    status === 'complete' ? 'text-[#10B981]' :
                    status === 'error' ? 'text-[#EF4444]' :
                    'text-[#9CA3AF]'
                  }`}>
                    {agent.statusLabel[status]}
                  </p>
                </div>
                {status === 'complete' && (
                  <span className="text-[10px] text-[#9CA3AF]">✓</span>
                )}
              </div>
              {!isLast && <Connector done={prevDone && statuses[AGENTS[i].key] === 'complete'} />}
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {hasError && (
        <div className="mt-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-[#EF4444]">
          An agent encountered an error. Please check the transcript and try again.
        </div>
      )}

      {/* All complete */}
      {AGENTS.every((a) => statuses[a.key] === 'complete') && !hasError && (
        <div className="mt-5 flex items-center gap-2 text-[13px] text-[#10B981] font-medium">
          <span className="w-5 h-5 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[10px]">✓</span>
          All agents complete — redirecting to review...
        </div>
      )}
    </div>
  );
}
