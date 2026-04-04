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
    <div className={`flex gap-4 transition-opacity duration-300 ${isDismissed ? 'opacity-50' : ''}`}>

      {/* ── Evidence card */}
      <div className={`flex-1 bg-white border border-gray-100 border-l-4 ${cfg.border} rounded-2xl shadow-sm overflow-hidden`}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3">
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
      <div className="w-48 flex-shrink-0 sticky top-4 self-start">
        {isPending ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden h-full">
            {/* Label */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Actions</span>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => onAction('dismiss')}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors border-b border-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Dismiss
            </button>

            {/* Confirm */}
            <button
              onClick={() => onAction('confirm')}
              className={`w-full flex items-center justify-center gap-2 px-4 py-4 text-[13px] font-bold transition-colors ${cfg.confirm}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Confirm & Log
            </button>
          </div>
        ) : (
          <div className="w-48" />
        )}
      </div>
    </div>
  );
}
