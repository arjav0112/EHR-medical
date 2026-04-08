'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SectionKey } from '@/lib/store/sessionStore';

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_ID = 'dev-preview-001';

const SECTION_LABELS: Record<SectionKey, string> = {
  risk_flags: 'Risk Protocol',
  subjective: 'Subjective',
  objective: 'Objective',
  assessment: 'Assessment',
  plan: 'Plan',
};

const MOCK_SECTION_STATUSES: Record<SectionKey, string> = {
  risk_flags: 'approved',
  subjective: 'edited',
  objective: 'approved',
  assessment: 'revised',
  plan: 'approved',
};

const MOCK_CONFIRMED_FLAGS = [
  { type: 'suicidal_ideation', label: 'Suicidal Ideation' },
];

function provenanceLabel(status: string): { text: string; style: string } {
  if (status === 'edited') return { text: 'CLINICIAN OVERRIDE', style: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
  if (status === 'revised') return { text: 'NEURAL REVISION', style: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
  return { text: 'AI SYNTHESIZED', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
}

// ── Pill Navbar (same as loading/processing page) ──────────────────────────────

function PillNav() {
  return (
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
          <span className="text-gray-400 font-medium">Review</span>
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-violet-600">Export</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session</span>
          <span className="text-[11px] font-mono font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full truncate max-w-[160px]">
            {MOCK_ID}
          </span>
        </div>
      </div>
    </header>
  );
}

// ── Dev Preview Wrapper ────────────────────────────────────────────────────────

export default function ExportPreviewPage() {
  const [copyDone, setCopyDone] = useState(false);
  const [fhirLoading, setFhirLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [addendum, setAddendum] = useState('');

  const mockPdfClick = async () => {
    setPdfLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setPdfLoading(false);
  };
  const mockFhirClick = async () => {
    setFhirLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setFhirLoading(false);
  };
  const mockCopyClick = async () => {
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2500);
  };

  const sections = Object.keys(SECTION_LABELS) as SectionKey[];

  return (
    <main className="min-h-screen bg-[#0A0F1E] selection:bg-neon-500/30 selection:text-neon-500">
      <PillNav />

      {/* DEV BANNER — sits just below the pill nav */}
      <div className="fixed top-[76px] inset-x-0 z-40 flex items-center justify-center gap-3 bg-amber-500/10 border-b border-amber-500/20 py-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">Dev Preview — Mock Data — Export / PDF Download Page</span>
      </div>

      <div className="pt-40 pb-40 px-6 max-w-[1000px] mx-auto relative">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* ── Success header ── */}
        <div className="text-center mb-20 relative z-10 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="w-24 h-24 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(16,185,129,0.3)] rotate-3">
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-6xl font-bold text-white tracking-tight mb-4">Verification Complete</h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            All clinical vectors have been synchronized and successfully captured into the immutable session state.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

          {/* Top Row: Audit & Addendum */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">

            {/* Audit Summary Card */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 flex flex-col group transition-all duration-700 animate-in fade-in slide-in-from-left-10 hover:bg-white/[0.06]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[12px] font-bold text-white uppercase tracking-[0.3em]">Session Audit Matrix</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">ID: {MOCK_ID.slice(0, 8)}</span>
                </div>
              </div>

              <div className="space-y-1 flex-1">
                {sections.map((key) => {
                  const status = MOCK_SECTION_STATUSES[key];
                  const prov = provenanceLabel(status);
                  return (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0 group/row">
                      <span className="text-[14px] font-medium text-gray-300 group-hover/row:text-white transition-colors">{SECTION_LABELS[key]}</span>
                      <span className={`text-[9px] font-bold px-3 py-1 rounded-lg border uppercase tracking-wider transition-all ${prov.style}`}>
                        {prov.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {MOCK_CONFIRMED_FLAGS.length > 0 && (
                <div className="mt-8 pt-6 border-t border-red-500/20">
                  <div className="flex items-start gap-4 text-red-400">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-[13px] font-semibold uppercase tracking-wider leading-relaxed">
                      {MOCK_CONFIRMED_FLAGS.length} Protocol Violation{MOCK_CONFIRMED_FLAGS.length > 1 ? 's' : ''} detected and permanently logged in export bundle.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Clinician Addendum Card */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 flex flex-col group animate-in fade-in slide-in-from-right-10 duration-1000 hover:bg-white/[0.06] transition-all">
              <h2 className="text-[12px] font-bold text-white uppercase tracking-[0.3em] mb-6">Clinician Final Commentary</h2>
              <div className="relative group/field flex-1 mb-6">
                <textarea
                  value={addendum}
                  onChange={(e) => setAddendum(e.target.value)}
                  placeholder="Capture any final insights or clinical deviations..."
                  rows={6}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 rounded-xl px-5 py-5 text-[15px] text-white placeholder-gray-600 leading-relaxed focus:outline-none transition-all duration-300 min-h-[220px] resize-none"
                />
              </div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest text-center italic">Final addendum will be appended to the PDF/JSON metadata stream.</p>
            </div>
          </div>

          {/* Bottom Grid: Export Options */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* PDF Export */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 flex flex-col group/card transition-all duration-500 hover:bg-white/[0.07] hover:border-violet-500/30 animate-in slide-in-from-bottom-10">
              <div className="w-14 h-14 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover/card:scale-110 group-hover/card:bg-violet-500/20 transition-all">
                <svg className="w-7 h-7 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-white mb-2">Protocol PDF</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-8 flex-1">
                Formally rendered clinical documentation with cryptographic audit trail footer.
              </p>
              <button
                onClick={mockPdfClick}
                disabled={pdfLoading}
                className="w-full relative bg-white/5 border border-white/10 text-white text-[12px] font-bold uppercase tracking-[0.15em] py-3.5 rounded-xl hover:bg-violet-600 hover:border-violet-600 transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {pdfLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Rendering...
                    </>
                  ) : 'Synthesize PDF'}
                </span>
              </button>
            </div>

            {/* FHIR Export */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 flex flex-col group/card transition-all duration-500 hover:bg-white/[0.07] hover:border-cyan-500/30 animate-in slide-in-from-bottom-10 delay-100">
              <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover/card:scale-110 group-hover/card:bg-cyan-500/20 transition-all">
                <svg className="w-7 h-7 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="12" y1="2" x2="12" y2="22" />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-white mb-2">FHIR R4 Bundle</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-8 flex-1">
                Machine-readable DocumentReference for seamless HL7-compliant system integration.
              </p>
              <button
                onClick={mockFhirClick}
                disabled={fhirLoading}
                className="w-full relative bg-white/5 border border-white/10 text-white text-[12px] font-bold uppercase tracking-[0.15em] py-3.5 rounded-xl hover:bg-cyan-600 hover:border-cyan-600 transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {fhirLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mapping...
                    </>
                  ) : 'Export FHIR'}
                </span>
              </button>
            </div>

            {/* Clipboard Copy */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 flex flex-col group/card transition-all duration-500 hover:bg-white/[0.07] hover:border-emerald-500/30 animate-in slide-in-from-bottom-10 delay-200">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover/card:scale-110 group-hover/card:bg-emerald-500/20 transition-all">
                <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-white mb-2">Clipboard Stream</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-8 flex-1">
                Instant textual extraction for immediate manual entry into legacy EHR endpoints.
              </p>
              <button
                onClick={mockCopyClick}
                className="w-full relative bg-white/5 border border-white/10 text-white text-[12px] font-bold uppercase tracking-[0.15em] py-3.5 rounded-xl hover:bg-emerald-600 hover:border-emerald-600 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {copyDone ? (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Sequence Copied
                    </>
                  ) : 'Initiate Copy'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── New Session CTA ── */}
        <div className="text-center mt-24 relative z-10">
          <button className="group inline-flex items-center gap-4 text-[12px] font-bold text-gray-600 hover:text-white uppercase tracking-[0.3em] transition-all">
            <span className="w-10 h-[1px] bg-white/10 group-hover:bg-emerald-500 group-hover:w-16 transition-all duration-300" />
            Initialize New Neural Stream
            <span className="w-10 h-[1px] bg-white/10 group-hover:bg-emerald-500 group-hover:w-16 transition-all duration-300" />
          </button>
          <p className="text-[11px] text-gray-700 mt-8 max-w-lg mx-auto leading-relaxed uppercase tracking-widest">
            Automated session archival complete. Neural patterns preserved for future analytics.
          </p>
        </div>

      </div>
    </main>
  );
}
