'use client';

import { useState } from 'react';
import type { RiskFlag } from '@/lib/types';
import { RiskFlagCard } from './RiskFlagCard';

interface RiskFlagsSectionProps {
  flags: RiskFlag[];
  onFlagAction: (flagId: string, action: 'confirm' | 'dismiss') => void;
  onAllConfirmed: () => void;
}

export function RiskFlagsSection({
  flags,
  onFlagAction,
  onAllConfirmed,
}: RiskFlagsSectionProps) {
  const [localFlags, setLocalFlags] = useState<RiskFlag[]>(flags);
  const [allDone, setAllDone] = useState(false);

  const hasImmediate = localFlags.some((f) => f.requiresImmediateAction);
  const allActioned = localFlags.every((f) => f.status !== 'pending');

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-[#EF4444]" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-bold text-[#1A1A1A]">Risk Flags</h2>
            <span className="bg-[#FEE2E2] text-[#EF4444] text-[11px] font-bold px-2 py-0.5 rounded-full">
              {localFlags.length}
            </span>
          </div>
          <p className="text-[12px] text-[#6B7280] mt-0.5">
            Review each flag before proceeding to clinical note sections
          </p>
        </div>
      </div>

      {/* Immediate action banner */}
      {hasImmediate && (
        <div className="bg-[#EF4444] text-white rounded-xl px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-[13px] font-bold tracking-wide uppercase">
            IMMEDIATE ACTION REQUIRED — Contact emergency services or duty clinician now.
          </p>
        </div>
      )}

      {/* Flag cards */}
      <div className="space-y-3">
        {localFlags.map((flag, i) => (
          <RiskFlagCard
            key={i}
            flag={flag}
            flagId={`flag-${i}`}
            onAction={(action) => handleAction(i, action)}
          />
        ))}
      </div>

      {/* Confirm all button */}
      {!allDone && (
        <button
          onClick={handleConfirmAll}
          disabled={!allActioned}
          className="w-full py-3 rounded-xl text-[14px] font-semibold transition-all
            disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] disabled:cursor-not-allowed
            enabled:bg-[#6c63ff] enabled:text-white enabled:hover:bg-[#5a52d5]"
        >
          {allActioned
            ? 'Confirm all flags → unlock clinical note sections'
            : `Review all flags to continue (${localFlags.filter((f) => f.status === 'pending').length} remaining)`}
        </button>
      )}

      {allDone && (
        <div className="flex items-center gap-2 text-[13px] text-[#059669] font-medium px-1">
          <span className="w-5 h-5 bg-[#D1FAE5] rounded-full flex items-center justify-center text-[11px]">✓</span>
          All risk flags reviewed — Subjective and Objective sections are now unlocked.
        </div>
      )}
    </div>
  );
}
