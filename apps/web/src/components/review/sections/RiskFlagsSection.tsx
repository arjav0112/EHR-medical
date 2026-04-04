'use client';

import { useState, useRef, useEffect } from 'react';
import type { RiskFlag } from '@/lib/types';
import { RiskFlagCard } from './RiskFlagCard';

interface RiskFlagsSectionProps {
  flags: RiskFlag[];
  onFlagAction: (flagId: string, action: 'confirm' | 'dismiss') => void;
  onAllConfirmed: () => void;
}

export function RiskFlagsSection({ flags, onFlagAction, onAllConfirmed }: RiskFlagsSectionProps) {
  const [localFlags, setLocalFlags] = useState<RiskFlag[]>(flags);
  const [allDone, setAllDone] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      setShowScrollHint(!atBottom);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    return () => el.removeEventListener('scroll', check);
  }, [localFlags]);

  const pendingCount = localFlags.filter((f) => f.status === 'pending').length;
  const allActioned = pendingCount === 0;

  const handleAction = (idx: number, action: 'confirm' | 'dismiss') => {
    const updated = localFlags.map((f, i) =>
      i === idx ? { ...f, status: action === 'confirm' ? 'confirmed' : 'dismissed' } as RiskFlag : f
    );
    setLocalFlags(updated);
    onFlagAction(`flag-${idx}`, action);
  };

  const handleConfirmAll = () => {
    if (!allActioned) return;
    setAllDone(true);
    onAllConfirmed();
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Section header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-[28px] font-bold text-gray-900 tracking-tight leading-tight">Risk Flags</h2>
          <p className="text-[13px] text-gray-500 mt-1">Review and action all detected clinical risk signals</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg ${
            pendingCount > 0
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {pendingCount > 0 ? `${pendingCount} pending` : 'All actioned'}
          </span>
        </div>
      </div>

      {/* Cards — scrollable with scroll hint */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto space-y-4 scrollbar-hide pr-1"
        >
        {localFlags.map((flag, i) => (
          <RiskFlagCard
            key={i}
            flag={flag}
            flagId={`flag-${i}`}
            onAction={(action) => handleAction(i, action)}
          />
        ))}

        {/* Proceed button */}
        {!allDone ? (
          <div className="pt-2 pb-4 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setLocalFlags(flags.map(f => ({ ...f, status: 'pending' } as RiskFlag)));
                setAllDone(false);
              }}
              className="flex items-center gap-2 text-[12px] font-semibold text-gray-500 border border-gray-200 bg-white px-5 py-4 rounded-xl hover:border-gray-300 hover:text-gray-700 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
            <button
              onClick={handleConfirmAll}
              disabled={!allActioned}
              className={`flex items-center gap-2 px-7 py-4 rounded-xl text-[12px] font-bold transition-all duration-300 ${
                allActioned
                  ? 'bg-gray-900 text-white hover:bg-green-700 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {allActioned ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Proceed to Review
                </>
              ) : (
                `${pendingCount} flag${pendingCount !== 1 ? 's' : ''} pending`
              )}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4 animate-in fade-in duration-500">
            <div className="w-10 h-10 bg-green-100 border border-green-200 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-green-900">Risk Review Complete</h4>
              <p className="text-[12px] text-green-700 mt-0.5">All flags actioned — clinical sections are now available for review.</p>
            </div>
          </div>
        )}
        </div>

        {/* Scroll hint — fade gradient + bouncing chevron */}
        <div
          className={`pointer-events-none absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-3 h-24 transition-opacity duration-500 ${
            showScrollHint ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(249,250,251,0.95) 60%)' }}
        >
          <div className="animate-bounce">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
