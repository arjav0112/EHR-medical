'use client';

import { useState, useEffect } from 'react';
import type { RiskFlag } from '@/lib/types';
import { useSessionStore } from '@/lib/store/sessionStore';

interface RiskFlagsSectionProps {
  flags: RiskFlag[];
  onFlagAction: (flagId: string, action: 'confirm' | 'dismiss') => void;
  onAllConfirmed: () => void;
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
  { border: string; pill: string; bg: string }
> = {
  critical: {
    border: 'border-l-red-500',
    pill: 'bg-red-50 text-red-700 border-red-100',
    bg: 'bg-red-50/10',
  },
  high: {
    border: 'border-l-red-400',
    pill: 'bg-red-50 text-red-650 border-red-100',
    bg: 'bg-red-50/5',
  },
  moderate: {
    border: 'border-l-indigo-500',
    pill: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    bg: 'bg-indigo-50/10',
  },
  low: {
    border: 'border-l-blue-400',
    pill: 'bg-blue-50 text-blue-750 border-blue-100',
    bg: 'bg-blue-50/5',
  },
};

export function RiskFlagsSection({ flags, onFlagAction, onAllConfirmed }: RiskFlagsSectionProps) {
  const [localFlags, setLocalFlags] = useState<RiskFlag[]>(flags);
  const [allDone, setAllDone] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({});

  // Sync with store telemetry
  const reviewPackage = useSessionStore((s) => s.reviewPackage);

  // Publisher Widget dropdown state mocks for safety profile
  const [parentVal, setParentVal] = useState<string>('(no parent)');
  const [pageTemplateVal, setPageTemplateVal] = useState<string>('Default Template');

  useEffect(() => {
    // Initialise citations expanded state
    const initial: Record<number, boolean> = {};
    flags.forEach((_, i) => {
      initial[i] = true;
    });
    setExpandedCitations(initial);
  }, [flags]);

  const pendingCount = localFlags.filter((f) => f.status === 'pending').length;
  const allActioned = pendingCount === 0;

  const handleAction = (idx: number, action: 'confirm' | 'dismiss') => {
    const updated = localFlags.map((f, i) =>
      i === idx ? ({ ...f, status: action === 'confirm' ? 'confirmed' : 'dismissed' } as RiskFlag) : f
    );
    setLocalFlags(updated);
    onFlagAction(`flag-${idx}`, action);
  };

  const handleConfirmAll = () => {
    if (!allActioned) return;
    setAllDone(true);
    onAllConfirmed();
  };

  const toggleCitation = (idx: number) => {
    setExpandedCitations((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 gap-4">
      
      {/* ─── Two-Column CMS Gutenberg Layout ─── */}
      <div className="grid grid-cols-12 gap-6 items-stretch h-full min-h-0">
        
        {/* LEFT COLUMN: Workspace/Safety review area */}
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-4 min-h-0 h-full pb-0">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-[26px] font-black tracking-tight text-[#0f172a] font-sans">
              Report
            </h1>
          </div>

          {/* Note Title box matching SOAP Gutenberg */}
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-100 transition-all duration-200">
            <div className="flex-1 flex items-center gap-3">
              <input
                type="text"
                value="Risk Flags"
                disabled
                className="text-[17px] font-bold text-slate-800 bg-transparent border-none outline-none focus:outline-none w-24 tracking-tight cursor-default"
              />
            </div>
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0 cursor-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>

          {/* Main Gutenberg Editor-style card container */}
          <div className="flex flex-col flex-1 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden min-h-0">
            {/* Editor Sub-Header Row */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0 bg-gray-50/20">
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1.5 border border-[#1a9e8f]/20 bg-[#1a9e8f]/5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-[#1a9e8f] hover:bg-[#1a9e8f]/10 transition-colors shadow-sm cursor-default"
                >
                  <svg className="w-4 h-4 text-[#1a9e8f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Clinical Flags Monitor
                </button>
              </div>
              <div className="flex items-center gap-3 text-[12.5px] font-bold">
                <span className="text-gray-900 pb-0.5 cursor-default select-none">Visual</span>
                <button
                  className="text-gray-450 hover:text-slate-850 p-0.5 hover:bg-gray-100 rounded transition-all cursor-default flex items-center justify-center"
                  title="Full Screen View"
                >
                  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4h4M4 16v4h4M20 8V4h-4M20 16v4h-4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Custom Formatting Toolbar (Always fully styled to match SOAP editor layout exactly) */}
            <div className="flex items-center gap-0.5 px-4 py-2 border-b border-gray-100 bg-gray-50/70 flex-shrink-0 flex-wrap select-none opacity-85">
              <span className="text-[12px] font-bold text-slate-700 px-2 py-1 select-none mr-1 cursor-default">
                Heading ∨
              </span>
              <span className="w-px h-4 bg-gray-200 mx-1.5" />
              
              <div className="flex items-center gap-0.5 text-slate-400">
                <span className="flex items-center justify-center w-7.5 h-7.5 text-[13px] font-serif font-medium border-b-2 border-gray-250 pb-px">A</span>
                <span className="flex items-center justify-center w-7.5 h-7.5 text-gray-450">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </span>
                <span className="w-px h-4 bg-gray-200 mx-1.5" />
                <span className="font-extrabold text-[13px] w-7.5 h-7.5 flex items-center justify-center">B</span>
                <span className="italic text-[13px] w-7.5 h-7.5 flex items-center justify-center font-serif">I</span>
                <span className="underline text-[13px] w-7.5 h-7.5 flex items-center justify-center">U</span>
                <span className="line-through text-[13px] w-7.5 h-7.5 flex items-center justify-center">S</span>
                <span className="w-px h-4 bg-gray-200 mx-1.5" />
                <span className="w-7.5 h-7.5 flex items-center justify-center"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h10M4 18h14" /></svg></span>
                <span className="w-7.5 h-7.5 flex items-center justify-center"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M7 12h10M6 18h12" /></svg></span>
              </div>
              
              <div className="ml-auto text-[11px] text-gray-400 font-mono">
                {pendingCount} pending · {localFlags.length} total
              </div>
            </div>

            {/* Canvas: Scrollable list of flags */}
            <div className="flex-1 overflow-y-auto min-h-[350px] bg-slate-50/40 p-8 space-y-6 prose max-w-none">
              
              <h2 className="text-[20px] font-extrabold text-slate-800 leading-tight tracking-tight border-none p-0 m-0 pb-2">
                Chapter 0, Safety Diagnostics & Risk Evaluation
              </h2>

              {allDone ? (
                <div className="bg-emerald-50/20 border border-emerald-100 rounded-2xl p-6 flex items-center gap-4 animate-in fade-in duration-500">
                  <div className="w-10 h-10 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-emerald-900">Safety Review Complete</h4>
                    <p className="text-[12px] text-emerald-700 mt-0.5">All flags have been actioned. Clinical sections are now available for review.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {localFlags.map((flag, i) => {
                    const cfg = SEVERITY_CONFIG[flag.severity];
                    const isPending = flag.status === 'pending';
                    const isConfirmed = flag.status === 'confirmed';
                    const isDismissed = flag.status === 'dismissed';
                    const citationsOpen = !!expandedCitations[i];

                    return (
                      <div
                        key={i}
                        className={`border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row gap-5 items-start justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-200 border-l-4 ${cfg.border}
                          ${isConfirmed ? 'bg-emerald-50/20 border-emerald-100' : isDismissed ? 'opacity-40 bg-slate-50/30' : 'bg-white'}
                        `}
                      >
                        {/* Left contents */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-[14.5px] font-extrabold text-slate-800">
                              {FLAG_TYPE_LABELS[flag.type] || flag.type}
                            </span>
                            <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.pill}`}>
                              {flag.severity} risk
                            </span>
                            {flag.requiresImmediateAction && (
                              <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                                ⚡ Immediate Action
                              </span>
                            )}
                            {isConfirmed && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-full flex-shrink-0">
                                ✓ Confirmed
                              </span>
                            )}
                            {isDismissed && (
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full flex-shrink-0">
                                Dismissed
                              </span>
                            )}
                          </div>

                          {/* Evidence quote */}
                          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5">
                            <p className={`text-[13px] text-slate-700 italic leading-relaxed m-0 ${isDismissed ? 'line-through' : ''}`}>
                              &ldquo;{flag.evidence}&rdquo;
                            </p>
                            <button
                              onClick={() => toggleCitation(i)}
                              className="mt-2.5 flex items-center gap-1 text-[10.5px] font-bold text-slate-400 hover:text-slate-500 transition-colors uppercase tracking-wider cursor-pointer border-none bg-transparent p-0"
                            >
                              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${citationsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              </svg>
                              {citationsOpen ? 'Hide citation' : 'Show citation'}
                            </button>
                            {citationsOpen && (
                              <div className="mt-2.5 border-t border-slate-200/50 pt-2 flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span>Transcript location: {flag.transcriptLocation}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right button actions */}
                        <div className="w-full md:w-auto flex items-center flex-shrink-0 self-center">
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAction(i, 'dismiss')}
                                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-[12.5px] font-semibold text-slate-500 hover:text-slate-700 rounded-lg shadow-sm transition-all duration-150 cursor-pointer active:scale-[0.98]"
                              >
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Dismiss
                              </button>
                              <button
                                onClick={() => handleAction(i, 'confirm')}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1a9e8f] hover:bg-[#158a7c] text-[12.5px] font-semibold text-white rounded-lg shadow-sm transition-all duration-150 cursor-pointer active:scale-[0.98]"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirm & Log
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => {
                                  const updated = localFlags.map((f, idx) =>
                                    idx === i ? ({ ...f, status: 'pending' } as RiskFlag) : f
                                  );
                                  setLocalFlags(updated);
                                }}
                                className="px-3 py-1.5 border border-dashed border-slate-200 hover:border-slate-350 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-all cursor-pointer bg-transparent shadow-sm active:scale-[0.98]"
                              >
                                Reset Action
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Canvas Footer */}
            <div className="px-5 py-2.5 border-t border-gray-100 flex-shrink-0 bg-white flex items-center justify-between">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                Clinical Audit Trail Active
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="text-gray-400">Security:</span>
                <span className="text-[#1a9e8f] bg-[#1a9e8f]/10 px-2 py-0.5 rounded-full text-[10px] tracking-tight uppercase font-black">HIPAA Compliant</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar Widgets */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full min-h-0 pb-0">
          
          {/* Card 1: Safety Publisher */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-3.5 flex-shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[13.5px] text-slate-850 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Safety Publisher
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full font-bold">Active Section</span>
            </div>

            <div className="flex flex-col gap-2.5 text-[12.5px] text-slate-650 border-t border-slate-50 pt-3">
              {/* Status */}
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-gray-400 font-medium">Status</span>
                <span className={`text-[12px] font-black px-2.5 py-1 rounded-lg border
                  ${pendingCount > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}
                `}>
                  {pendingCount > 0 ? 'Safety Pending' : 'Safety Verified'}
                </span>
              </div>

              {/* Protocol */}
              <div className="flex items-center justify-between text-[13px] border-t border-slate-50 pt-2.5">
                <span className="text-gray-400 font-medium">Safety Standard</span>
                <span className="text-[12px] font-bold text-slate-700">DSM-5 Safety Log</span>
              </div>

              {/* Template */}
              <div className="flex items-center justify-between text-[13px] border-t border-slate-50 pt-2.5">
                <span className="text-gray-400 font-medium">Layout Template</span>
                <select
                  value={pageTemplateVal}
                  onChange={(e) => setPageTemplateVal(e.target.value)}
                  className="bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="Default Template">Default Template</option>
                  <option value="Brief Form">Brief Form</option>
                  <option value="Extended Details">Extended Details</option>
                </select>
              </div>
            </div>

            {/* Publisher Action Buttons */}
            <div className="flex items-center justify-between gap-3 mt-1 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setLocalFlags(flags.map((f) => ({ ...f, status: 'pending' } as RiskFlag)));
                  setAllDone(false);
                }}
                className="flex-1 flex items-center justify-center border border-slate-200 hover:bg-slate-50 text-[12.5px] font-bold text-slate-700 bg-white px-4 py-2 rounded-xl shadow-sm cursor-pointer transition-all"
              >
                Reset
              </button>
              
              <button
                onClick={handleConfirmAll}
                disabled={!allActioned || allDone}
                className="flex-1 flex items-center justify-center bg-[#0f172a] hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white px-4 py-2 rounded-xl text-[12.5px] font-bold cursor-pointer transition-all disabled:cursor-not-allowed shadow-sm animate-in fade-in"
              >
                {allDone ? 'Confirmed ✓' : 'Proceed'}
              </button>
            </div>
          </div>

          {/* Card 2: EHR Integration & Telemetry */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-3.5 flex-shrink-0 animate-in fade-in duration-200">
            <h3 className="font-extrabold text-[13.5px] text-slate-850 tracking-tight">
              EHR Integration & Telemetry
            </h3>
            
            <div className="flex flex-col gap-2.5 text-[12.5px] text-slate-650 border-t border-slate-50 pt-3">
              {/* EHR Parent */}
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-gray-400 font-medium">EHR Parent</span>
                <select
                  value={parentVal}
                  onChange={(e) => setParentVal(e.target.value)}
                  className="bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-700 max-w-[150px] truncate outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="(no parent)">(no parent)</option>
                  <option value="Main SOAP Session">Main SOAP Session</option>
                  <option value="Patient Records Root">Patient Records Root</option>
                </select>
              </div>

              {/* EHR Template */}
              <div className="flex items-center justify-between text-[13px] border-t border-slate-50 pt-2.5">
                <span className="text-gray-400 font-medium">EHR Template</span>
                <select
                  value={pageTemplateVal}
                  onChange={(e) => setPageTemplateVal(e.target.value)}
                  className="bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-700 max-w-[150px] truncate outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="Default Template">Default Template</option>
                  <option value="Clinical Layout Template">Clinical Layout Template</option>
                  <option value="Full Width Clean Canvas">Full Width Clean Canvas</option>
                </select>
              </div>

              {/* Clinical Telemetry Stats */}
              <div className="mt-2 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Processing Time
                  </span>
                  <span className="font-bold text-slate-800">
                    {reviewPackage?.agentMetadata?.processingTimeMs 
                      ? `${(reviewPackage.agentMetadata.processingTimeMs / 1000).toFixed(1)}s` 
                      : '67.6s'
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[12.5px]">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Transcript Quality
                  </span>
                  <span className="font-bold text-slate-800">
                    {reviewPackage?.agentMetadata?.transcriptQualityScore 
                      ? `${Math.round(reviewPackage.agentMetadata.transcriptQualityScore * 100)}%` 
                      : '100%'
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[12.5px]">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    LLM Engine
                  </span>
                  <span className="text-[#1a9e8f] font-bold bg-[#1a9e8f]/10 px-2 py-0.5 rounded-full text-[10px] tracking-tight">Gemini 1.5 Pro</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
