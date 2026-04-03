'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/layout/Nav';
import { useSessionStore, selectAllApproved, type SectionKey } from '@/lib/store/sessionStore';
import { generateFhirDocumentReference } from '@/lib/export/generateFhir';

const SECTION_LABELS: Record<SectionKey, string> = {
  risk_flags: 'Risk Protocol',
  subjective: 'Subjective',
  objective: 'Objective',
  assessment: 'Assessment',
  plan: 'Plan',
};

function provenanceLabel(status: string): { text: string; style: string } {
  if (status === 'edited') return { text: 'CLINICIAN OVERRIDE', style: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
  if (status === 'revised') return { text: 'NEURAL REVISION', style: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
  return { text: 'AI SYNTHESIZED', style: 'bg-neon-500/10 text-neon-400 border-neon-500/20' };
}

// ─── Export Page ──────────────────────────────────────────────────────────────

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { sectionStatuses, reviewPackage, input, reset } = useSessionStore();
  const allApproved = useSessionStore(selectAllApproved);

  const [copyDone, setCopyDone] = useState(false);
  const [fhirLoading, setFhirLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [addendum, setAddendum] = useState('');

  useEffect(() => {
    if (!allApproved) {
      router.replace(`/session/${id}/review`);
    }
  }, [allApproved, id, router]);

  if (!allApproved || !reviewPackage) return null;

  const handleDownloadFHIR = async () => {
    if (!reviewPackage) return;
    setFhirLoading(true);
    try {
      const fhir = generateFhirDocumentReference(reviewPackage);
      const blob = new Blob([JSON.stringify(fhir, null, 2)], { type: 'application/fhir+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fhir-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setFhirLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reviewPackage) return;
    setPdfLoading(true);
    try {
      const res = await fetch('/api/session/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPackage),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clinical-note-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCopyText = async () => {
    const soap = reviewPackage.soapNote;
    const text = (
      ['subjective', 'objective', 'assessment', 'plan'] as const
    )
      .map((k) => `## ${k.toUpperCase()}\n${soap[k]?.content ?? ''}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2500);
  };

  const sections = Object.keys(SECTION_LABELS) as SectionKey[];
  const confirmedFlags = reviewPackage.riskFlags.filter((f) => f.status === 'confirmed');

  return (
    <main className="min-h-screen bg-navy-950 selection:bg-neon-500/30 selection:text-neon-500">
      <Nav />
      <div className="pt-32 pb-40 px-6 max-w-[1000px] mx-auto relative">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-neon-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* ── Success header ── */}
        <div className="text-center mb-20 relative z-10 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="w-24 h-24 bg-neon-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(190,242,100,0.3)] rotate-3">
            <svg className="w-12 h-12 text-navy-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-6xl font-serif font-medium text-white tracking-tight mb-4">Verification Complete</h1>
          <p className="text-xl text-navy-400 font-serif font-light max-w-xl mx-auto leading-relaxed">
            All clinical vectors have been synchronized and successfully captured into the immutable session state.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

          {/* Left Column: Audit & Addendum */}
          <div className="lg:col-span-12 xl:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">

            {/* Audit Summary Card */}
            <div className="glass-card bg-white/[0.02] border-white/10 p-8 flex flex-col group transition-all duration-700 animate-in fade-in slide-in-from-left-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[12px] font-bold text-white uppercase tracking-[0.3em]">Session Audit Matrix</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neon-500 shadow-[0_0_10px_rgba(190,242,100,0.8)] animate-pulse" />
                  <span className="text-[10px] font-bold text-navy-500 uppercase tracking-widest font-mono">ID: {id.slice(0, 8)}</span>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {sections.map((key) => {
                  const status = sectionStatuses[key];
                  const prov = provenanceLabel(status);
                  return (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-white/[0.03] last:border-0 group/row">
                      <span className="text-[14px] font-serif font-medium text-navy-300 group-hover/row:text-white transition-colors">{SECTION_LABELS[key]}</span>
                      <span className={`text-[9px] font-bold px-3 py-1 rounded-lg border uppercase tracking-wider backdrop-blur-md transition-all ${prov.style}`}>
                        {prov.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {confirmedFlags.length > 0 && (
                <div className="mt-8 pt-6 border-t border-red-500/20">
                  <div className="flex items-start gap-4 text-red-400">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-[13px] font-bold uppercase tracking-wider leading-relaxed">
                      {confirmedFlags.length} Protocol Violation{confirmedFlags.length > 1 ? 's' : ''} detected and permanently logged in neutral export bundle.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Clinician Addendum Card */}
            <div className="glass-card bg-white/[0.02] border-white/10 p-8 flex flex-col group animate-in fade-in slide-in-from-right-10 duration-1000">
              <h2 className="text-[12px] font-bold text-white uppercase tracking-[0.3em] mb-6">Clinician Final Commentary</h2>
              <div className="relative group/field flex-1 mb-6">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <textarea
                  value={addendum}
                  onChange={(e) => setAddendum(e.target.value)}
                  placeholder="Capture any final neural insights or clinical deviations..."
                  rows={6}
                  className="w-full bg-navy-950/40 border border-white/5 group-focus-within/field:border-neon-500/30 rounded-2xl px-6 py-6 text-[15px] text-white placeholder-navy-700 leading-relaxed font-serif focus:outline-none transition-all duration-500 min-h-[220px]"
                />
              </div>
              <p className="text-[10px] font-bold text-navy-600 uppercase tracking-widest text-center italic">Final addendum will be appended to the PDF/JSON metadata stream.</p>
            </div>
          </div>

          {/* Bottom Grid: Export Options */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* PDF Export */}
            <div className="glass-card bg-white/[0.02] border-white/10 p-8 group/card transition-all duration-500 hover:bg-white/[0.04] animate-in slide-in-from-bottom-10">
              <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-8 group-hover/card:scale-110 transition-transform">
                <svg className="w-7 h-7 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 className="text-xl font-serif font-medium text-white mb-2">Protocol PDF</h3>
              <p className="text-[13px] text-navy-400 leading-relaxed mb-8 flex-1 font-serif">
                Formally rendered clinical documentation with cryptographic audit trail footer.
              </p>
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="w-full group/btn relative bg-white/5 border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-neon-500 hover:text-navy-950 hover:border-transparent transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                <span className="relative z-10">
                  {pdfLoading ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="w-3.5 h-3.5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                      Rendering...
                    </span>
                  ) : 'Synthesize PDF'}
                </span>
              </button>
            </div>

            {/* FHIR Export */}
            <div className="glass-card bg-white/[0.02] border-white/10 p-8 group/card transition-all duration-500 hover:bg-white/[0.04] animate-in slide-in-from-bottom-10 delay-100">
              <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mb-8 group-hover/card:scale-110 transition-transform">
                <svg className="w-7 h-7 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="12" y1="2" x2="12" y2="22" />
                </svg>
              </div>
              <h3 className="text-xl font-serif font-medium text-white mb-2">FHIR R4 Bundle</h3>
              <p className="text-[13px] text-navy-400 leading-relaxed mb-8 flex-1 font-serif">
                Machine-readable DocumentReference for seamless integration into HL7-compliant systems.
              </p>
              <button
                onClick={handleDownloadFHIR}
                disabled={fhirLoading}
                className="w-full group/btn relative bg-white/5 border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-neon-500 hover:text-navy-950 hover:border-transparent transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                <span className="relative z-10">
                  {fhirLoading ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mapping...
                    </span>
                  ) : 'Export FHIR'}
                </span>
              </button>
            </div>

            {/* Clipboard Copy */}
            <div className="glass-card bg-white/[0.02] border-white/10 p-8 group/card transition-all duration-500 hover:bg-white/[0.04] animate-in slide-in-from-bottom-10 delay-200">
              <div className="w-14 h-14 bg-neon-500/10 border border-neon-500/20 rounded-2xl flex items-center justify-center mb-8 group-hover/card:scale-110 transition-transform">
                <svg className="w-7 h-7 text-neon-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </div>
              <h3 className="text-xl font-serif font-medium text-white mb-2">Clipboard Stream</h3>
              <p className="text-[13px] text-navy-400 leading-relaxed mb-8 flex-1 font-serif">
                Instant textual extraction for immediate manual entry into legacy EHR endpoints.
              </p>
              <button
                onClick={handleCopyText}
                className="w-full group/btn relative bg-white/5 border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-neon-500 hover:text-navy-950 hover:border-transparent transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                <span className="relative z-10">{copyDone ? '✓ Sequence Copied' : 'Initiate Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Start New Session ── */}
        <div className="text-center mt-32 relative z-10 animate-in slide-in-from-bottom-5 duration-1000 delay-500">
          <button
            onClick={() => { reset(); router.push('/session/new'); }}
            className="group inline-flex items-center gap-4 text-[13px] font-bold text-navy-400 hover:text-white uppercase tracking-[0.3em] transition-all"
          >
            <span className="w-12 h-[1px] bg-white/10 group-hover:bg-neon-500 group-hover:w-20 transition-all" />
            Initialize New Neural Stream
            <span className="w-12 h-[1px] bg-white/10 group-hover:bg-neon-500 group-hover:w-20 transition-all" />
          </button>
          <p className="text-[11px] text-navy-600 mt-12 max-w-lg mx-auto leading-relaxed font-serif uppercase tracking-widest opacity-50">
            Automated session archival. Digital clinical representation finalized.
            Neural patterns preserved for future predictive analytics.
          </p>
        </div>

      </div>
    </main>
  );
}
