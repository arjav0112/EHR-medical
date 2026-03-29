'use client';

import { useState } from 'react';
import type { RiskFlag } from '@/lib/types';

interface RiskFlagCardProps {
  flag: RiskFlag;
  flagId: string;
  onAction: (action: 'confirm' | 'dismiss') => void;
}

const FLAG_TYPE_LABELS: Record<RiskFlag['type'], string> = {
  suicidal_ideation: 'Suicidal Ideation',
  self_harm: 'Self-Harm',
  abuse_disclosure: 'Abuse Disclosure',
  medication_noncompliance: 'Medication Non-compliance',
  psychosis_indicator: 'Psychosis Indicator',
  other: 'Other',
};

const SEVERITY_CONFIG: Record<
  RiskFlag['severity'],
  { border: string; pill: string; confirm: string; confirmHover: string }
> = {
  critical: {
    border: 'border-l-[#EF4444]',
    pill: 'bg-red-100 text-red-700',
    confirm: 'bg-[#EF4444] text-white',
    confirmHover: 'hover:bg-red-700',
  },
  high: {
    border: 'border-l-[#EF4444]',
    pill: 'bg-red-100 text-red-700',
    confirm: 'bg-[#EF4444] text-white',
    confirmHover: 'hover:bg-red-700',
  },
  moderate: {
    border: 'border-l-[#F59E0B]',
    pill: 'bg-amber-100 text-amber-700',
    confirm: 'bg-[#F59E0B] text-white',
    confirmHover: 'hover:bg-amber-600',
  },
  low: {
    border: 'border-l-[#3B82F6]',
    pill: 'bg-blue-100 text-blue-700',
    confirm: 'bg-[#3B82F6] text-white',
    confirmHover: 'hover:bg-blue-600',
  },
};

export function RiskFlagCard({ flag, onAction }: RiskFlagCardProps) {
  const [citationsOpen, setCitationsOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[flag.severity];
  const isActioned = flag.status !== 'pending';
  const isConfirmed = flag.status === 'confirmed';
  const isDismissed = flag.status === 'dismissed';

  return (
    <div
      className={`bg-white border border-[#E8E8E8] border-l-4 ${cfg.border} rounded-r-xl ${
        isDismissed ? 'opacity-60' : ''
      } transition-opacity`}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[14px] font-semibold text-[#1A1A1A]">
            {FLAG_TYPE_LABELS[flag.type]}
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.pill}`}>
            {flag.severity}
          </span>
          {flag.requiresImmediateAction && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
              ⚡ Immediate
            </span>
          )}
        </div>
        {/* Status badge */}
        {isConfirmed && (
          <span className="text-[11px] font-semibold text-[#059669] bg-[#D1FAE5] px-2.5 py-0.5 rounded-full flex-shrink-0">
            ✓ Confirmed
          </span>
        )}
        {isDismissed && (
          <span className="text-[11px] font-semibold text-[#6B7280] bg-[#F3F4F6] px-2.5 py-0.5 rounded-full flex-shrink-0">
            Dismissed
          </span>
        )}
      </div>

      {/* Evidence block */}
      <div className="mx-5 mb-3 bg-[#F9F9F9] border border-[#EBEBEB] rounded-lg px-4 py-3">
        <p className={`text-[13px] text-[#4A4A4A] italic leading-relaxed font-mono ${isDismissed ? 'line-through' : ''}`}>
          &ldquo;{flag.evidence}&rdquo;
        </p>
        <button
          onClick={() => setCitationsOpen((p) => !p)}
          className="mt-1.5 text-[11px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
        >
          {citationsOpen ? '▲ Hide' : '▼ Show'} citation
        </button>
        {citationsOpen && (
          <p className="mt-1.5 text-[11px] text-[#9CA3AF] font-mono">
            Transcript · {flag.transcriptLocation}
          </p>
        )}
      </div>

      {/* Protocol */}
      {flag.protocolTriggered && (
        <div className="mx-5 mb-3 text-[12px] text-[#6B7280]">
          <span className="font-semibold text-[#4A4A4A]">Protocol: </span>
          {flag.protocolTriggered}
        </div>
      )}

      {/* Actions */}
      {!isActioned && (
        <div className="flex items-center gap-2 px-5 pb-4">
          <button
            onClick={() => onAction('dismiss')}
            className="text-[13px] font-medium text-[#6B7280] border border-[#E0DDD6] px-4 py-1.5 rounded-full hover:bg-[#F5F5F5] transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => onAction('confirm')}
            className={`text-[13px] font-semibold px-4 py-1.5 rounded-full transition-colors ${cfg.confirm} ${cfg.confirmHover}`}
          >
            Confirm flag
          </button>
        </div>
      )}
    </div>
  );
}
