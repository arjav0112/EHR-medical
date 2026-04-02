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
  { border: string; pill: string; confirm: string; confirmHover: string; glow: string }
> = {
  critical: {
    border: 'border-l-red-600',
    pill: 'bg-red-500/20 text-red-400 border-red-500/30',
    confirm: 'bg-red-600 text-white',
    confirmHover: 'hover:bg-red-500',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.1)]',
  },
  high: {
    border: 'border-l-red-500',
    pill: 'bg-red-500/10 text-red-400 border-red-500/20',
    confirm: 'bg-red-500 text-white',
    confirmHover: 'hover:bg-red-400',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]',
  },
  moderate: {
    border: 'border-l-amber-500',
    pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    confirm: 'bg-amber-600 text-navy-950',
    confirmHover: 'hover:bg-amber-500',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.05)]',
  },
  low: {
    border: 'border-l-cyan-500',
    pill: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    confirm: 'bg-cyan-600 text-navy-950',
    confirmHover: 'hover:bg-cyan-500',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.05)]',
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
      className={`glass-card border-l-4 ${cfg.border} overflow-hidden ${
        isDismissed ? 'opacity-40 filter grayscale' : ''
      } transition-all duration-500 group ${cfg.glow} hover:shadow-2xl`}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div className="flex items-center flex-wrap gap-3">
          <span className="text-lg font-serif font-medium text-white tracking-tight">
            {FLAG_TYPE_LABELS[flag.type]}
          </span>
          <span className={`text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-widest border ${cfg.pill}`}>
            {flag.severity} RISK
          </span>
          {flag.requiresImmediateAction && (
            <span className="text-[10px] font-bold px-3 py-1 rounded-lg bg-red-600 text-white animate-pulse">
              IMMEDIATE
            </span>
          )}
        </div>
        
        {/* Status indicator */}
        <div className="flex-shrink-0">
          {isConfirmed && (
            <div className="flex items-center gap-2 bg-neon-500/10 border border-neon-500/30 px-3 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-500 shadow-[0_0_8px_rgba(190,242,100,0.8)]" />
              <span className="text-[10px] font-bold text-neon-400 uppercase tracking-widest">Logged</span>
            </div>
          )}
          {isDismissed && (
             <div className="flex items-center gap-2 bg-navy-900 border border-white/10 px-3 py-1 rounded-lg opacity-50">
               <span className="text-[10px] font-bold text-navy-400 uppercase tracking-widest font-mono">Dismissed</span>
             </div>
          )}
        </div>
      </div>

      {/* Evidence block */}
      <div className="mx-6 mb-4 relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-navy-800 rounded-full" />
        <div className="pl-6 py-4 bg-white/[0.02] border border-white/5 rounded-xl group-hover:bg-white/[0.04] transition-colors">
          <p className={`text-[15px] text-navy-200 leading-relaxed font-serif italic ${isDismissed ? 'line-through' : ''}`}>
            &ldquo;{flag.evidence}&rdquo;
          </p>
          
          <button
            onClick={() => setCitationsOpen((p) => !p)}
            className="mt-4 flex items-center gap-2 text-[11px] font-bold text-navy-500 hover:text-white uppercase tracking-widest transition-all"
          >
            <span className="w-4 h-[1px] bg-navy-600 transition-all group-hover:w-6" />
            {citationsOpen ? 'Close Metadata' : 'View Citation'}
          </button>
          
          <div className={`overflow-hidden transition-all duration-500 ${citationsOpen ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
            <div className="p-3 bg-navy-950/50 rounded-lg border border-white/5 text-[12px] font-mono text-cyan-400 flex items-center gap-3">
              <span className="text-navy-600">SOURCE:</span>
              TRANSCRIPT · {flag.transcriptLocation}
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Protocol Description */}
      {flag.protocolTriggered && (
        <div className="mx-6 mb-6 px-6 py-3 bg-neon-500/5 border border-neon-500/10 rounded-xl flex gap-3 items-center">
          <svg className="w-4 h-4 text-neon-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[12px] text-navy-300">
            <span className="font-bold text-neon-500 uppercase tracking-widest text-[10px] mr-2">PROTOCOL:</span>
            {flag.protocolTriggered}
          </p>
        </div>
      )}

      {/* Actions */}
      {!isActioned && (
        <div className="flex items-center gap-3 px-6 pb-6 mt-2">
          <button
            onClick={() => onAction('dismiss')}
            className="flex-1 text-[12px] font-bold text-navy-400 uppercase tracking-widest border border-white/10 px-6 py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all"
          >
            Ignore Node
          </button>
          <button
            onClick={() => onAction('confirm')}
            className={`flex-1 text-[12px] font-bold uppercase tracking-[0.15em] px-6 py-3 rounded-xl transition-all duration-300 shadow-xl ${cfg.confirm} ${cfg.confirmHover}`}
          >
            Initialize Log
          </button>
        </div>
      )}
    </div>
  );
}

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-white/5">
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
          <svg className="w-6 h-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-serif font-medium text-white tracking-tight">Risk Assessment</h2>
            <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              {localFlags.length} Detected
            </span>
          </div>
          <p className="text-[13px] text-navy-400 mt-1 uppercase tracking-widest font-bold">
            Protocol: Initialize verification for all detected clinical risks
          </p>
        </div>
      </div>

      {/* Immediate action banner */}
      {hasImmediate && (
        <div className="relative group overflow-hidden bg-red-600 text-white rounded-2xl p-6 shadow-[0_0_50px_rgba(220,38,38,0.2)] animate-pulse-glow">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
               <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M11.3 1.047a1 1 0 00-1.3 0l-7 7a1 1 0 001.414 1.414L10 3.172l5.586 5.586A1 1 0 0017 10V17a2 2 0 01-2 2H5a2 2 0 01-2-2V10a1 1 0 00-1.414-1.414l-1 1A1 1 0 001.3 8.353l7-7z" clipRule="evenodd" />
               </svg>
            </div>
            <div>
              <p className="text-lg font-serif font-bold leading-tight">Critical Intervention Protocol Active</p>
              <p className="text-[13px] text-white/80 font-medium uppercase tracking-widest mt-1">
                Emergency Contact Mandate — Notify Duty Clinician Immediately
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Flag cards */}
      <div className="grid grid-cols-1 gap-6">
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
        <div className="pt-8 flex justify-center">
          <button
            onClick={handleConfirmAll}
            disabled={!allActioned}
            className={`relative group px-12 py-5 rounded-2xl font-bold text-[14px] uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden ${
              allActioned
                ? 'bg-neon-500 text-navy-950 shadow-[0_0_40px_rgba(190,242,100,0.2)]'
                : 'bg-white/5 text-navy-500 border border-white/10 cursor-not-allowed opacity-50'
            }`}
          >
            {allActioned && <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />}
            <span className="relative z-10 flex items-center gap-3">
              {allActioned
                ? <>Initialize Clinical Review <span className="text-xl">→</span></>
                : <>Verification Pending ({localFlags.filter((f) => f.status === 'pending').length} left)</>}
            </span>
          </button>
        </div>
      )}

      {allDone && (
        <div className="glass-card border-neon-500/30 p-8 flex items-center gap-6 animate-in zoom-in-95 duration-500">
          <div className="w-14 h-14 bg-neon-500/20 border border-neon-500/30 rounded-full flex items-center justify-center text-2xl text-neon-500 shadow-[0_0_20px_rgba(190,242,100,0.2)]">
            ✓
          </div>
          <div>
            <h4 className="text-xl font-serif font-medium text-white mb-1">Risk Review Synchronized</h4>
            <p className="text-[13px] text-navy-400 uppercase tracking-widest font-bold">
              Protocol: Clinical note sections have been initialized for review.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
