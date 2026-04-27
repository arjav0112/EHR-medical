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
  homicidal_ideation: 'Homicidal Ideation',
  abuse_disclosure: 'Abuse Disclosure',
  medication_noncompliance: 'Medication Non-compliance',
  psychosis_indicator: 'Psychosis Indicator',
  substance_abuse: 'Substance Abuse',
  other: 'Other',
};

const SEVERITY_CONFIG: Record<
  RiskFlag['severity'],
  { border: string; pill: string; confirm: string; confirmHover: string }
> = {
  critical: {
    border: 'border-l-red-500',
    pill: 'bg-red-100 text-red-700',
    confirm: 'bg-red-600 hover:bg-red-700 text-white',
    confirmHover: '',
  },
  high: {
    border: 'border-l-red-400',
    pill: 'bg-red-100 text-red-600',
    confirm: 'bg-red-500 hover:bg-red-600 text-white',
    confirmHover: '',
  },
  moderate: {
    border: 'border-l-amber-500',
    pill: 'bg-amber-100 text-amber-700',
    confirm: 'bg-amber-600 hover:bg-amber-700 text-white',
    confirmHover: '',
  },
  low: {
    border: 'border-l-blue-400',
    pill: 'bg-blue-100 text-blue-700',
    confirm: 'bg-blue-600 hover:bg-blue-700 text-white',
    confirmHover: '',
  },
};

export function RiskFlagCard({ flag, onAction }: RiskFlagCardProps) {
  const [citationsOpen, setCitationsOpen] = useState(true);
  const cfg = SEVERITY_CONFIG[flag.severity];
  const isPending = flag.status === 'pending';
  const isConfirmed = flag.status === 'confirmed';
  const isDismissed = flag.status === 'dismissed';

  return (
    <div className={`flex flex-col gap-4 transition-opacity duration-300 lg:flex-row ${isDismissed ? 'opacity-50' : ''}`}>

      {/* ── Evidence card */}
      <div className={`flex-1 overflow-hidden rounded-2xl border border-gray-100 border-l-4 bg-white shadow-sm ${cfg.border}`}>

        {/* Header */}
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-[14px] font-semibold text-gray-900">
              {FLAG_TYPE_LABELS[flag.type]}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.pill}`}>
              {flag.severity} risk
            </span>
            {flag.requiresImmediateAction && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 animate-pulse">
                ⚡ Immediate
              </span>
            )}
          </div>
          {isConfirmed && (
            <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full flex-shrink-0">
              ✓ Confirmed
            </span>
          )}
          {isDismissed && (
            <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full flex-shrink-0">
              Dismissed
            </span>
          )}
        </div>

        {/* Evidence quote */}
        <div className="mx-5 mb-4 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          <p className={`text-[13px] text-gray-700 italic leading-relaxed ${isDismissed ? 'line-through' : ''}`}>
            &ldquo;{flag.evidence}&rdquo;
          </p>
          <button
            onClick={() => setCitationsOpen((p) => !p)}
            className="mt-2 flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wide"
          >
            <svg className={`w-3 h-3 transition-transform ${citationsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {citationsOpen ? 'Hide citation' : 'Show citation'}
          </button>
          {citationsOpen && (
            <p className="mt-1.5 text-[11px] text-gray-400 font-mono">
              Transcript · {flag.transcriptLocation}
            </p>
          )}
        </div>
      </div>

      {/* ── Actions panel */}
      <div className="w-full flex-shrink-0 self-start lg:sticky lg:top-4 lg:w-48">
        {isPending ? (
          <div className="h-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* Label */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Actions</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2">
              <button
                onClick={() => onAction('dismiss')}
                className="flex w-full items-center justify-center gap-2 border-b border-gray-100 px-4 py-4 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800 sm:border-b-0 sm:border-r lg:border-r-0 lg:border-b"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Dismiss
              </button>

              <button
                onClick={() => onAction('confirm')}
                className={`flex w-full items-center justify-center gap-2 px-4 py-4 text-[13px] font-bold transition-colors ${cfg.confirm}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Confirm & Log
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden lg:block lg:w-48" />
        )}
      </div>
    </div>
  );
}
