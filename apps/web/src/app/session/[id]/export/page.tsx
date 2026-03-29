'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/layout/Nav';
import { useSessionStore, selectAllApproved, type SectionKey } from '@/lib/store/sessionStore';
import { generateFhirDocumentReference } from '@/lib/export/generateFhir';

// ─── Labels & helpers ─────────────────────────────────────────────────────────

const SECTION_LABELS: Record<SectionKey, string> = {
  risk_flags: 'Risk Flags',
  subjective: 'Subjective',
  objective: 'Objective',
  assessment: 'Assessment',
  plan: 'Plan',
};

function provenanceLabel(status: string): { text: string; style: string } {
  if (status === 'edited') return { text: 'Clinician edited · Approved', style: 'bg-blue-100 text-blue-700' };
  if (status === 'revised') return { text: 'AI revised · Approved', style: 'bg-[#EDE9FF] text-[#6c63ff]' };
  return { text: 'AI drafted · Approved', style: 'bg-[#D1FAE5] text-[#059669]' };
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

  // Redirect if not all approved
  useEffect(() => {
    if (!allApproved) {
      router.replace(`/session/${id}/review`);
    }
  }, [allApproved, id, router]);

  if (!allApproved || !reviewPackage) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

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
      alert('Failed to generate FHIR document.');
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
      alert('PDF generation failed. Please try again.');
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
    <main className="min-h-screen bg-[#FAFAF8]">
      <Nav />
      <div className="pt-24 pb-24 px-6 max-w-[860px] mx-auto">

        {/* ── Success header ── */}
        <div className="text-center mt-8 mb-12">
          <div className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-5 shadow-md">
            <svg className="w-7 h-7 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-[40px] font-extrabold text-[#1A1A1A] tracking-tight">Note complete</h1>
          <p className="text-[16px] text-[#6B7280] mt-2">
            All 5 sections reviewed and approved. Ready to export.
          </p>
        </div>

        {/* ── Audit summary card ── */}
        <div className="bg-white border border-[#E0DDD6] rounded-2xl p-6 mb-6">
          <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Session audit summary</h2>
          <div className="space-y-0 divide-y divide-[#F0EDE8]">
            {sections.map((key) => {
              const status = sectionStatuses[key];
              const prov = provenanceLabel(status);
              return (
                <div key={key} className="flex items-center justify-between py-3">
                  <span className="text-[14px] text-[#1A1A1A]">{SECTION_LABELS[key]}</span>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${prov.style}`}>
                    {prov.text}
                  </span>
                </div>
              );
            })}
          </div>
          {confirmedFlags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#F0EDE8]">
              <p className="text-[12px] font-semibold text-[#EF4444]">
                ⚠ {confirmedFlags.length} risk flag{confirmedFlags.length > 1 ? 's' : ''} confirmed and included in export
              </p>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-[#E0DDD6] text-right">
            <span className="text-[12px] text-[#9CA3AF]">
              Reviewed{' '}
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* ── Clinician addendum ── */}
        <div className="bg-white border border-[#E0DDD6] rounded-2xl p-6 mb-6">
          <h2 className="text-[14px] font-bold text-[#1A1A1A] mb-2">
            Clinician addendum{' '}
            <span className="text-[12px] font-normal text-[#9CA3AF]">(optional)</span>
          </h2>
          <textarea
            value={addendum}
            onChange={(e) => setAddendum(e.target.value)}
            placeholder="Add any additional clinical observations or notes not captured above..."
            rows={3}
            className="w-full text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] border border-[#E0DDD6] rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-[#6c63ff] transition-colors leading-relaxed"
          />
        </div>

        {/* ── Export cards ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">

          {/* PDF */}
          <div className="bg-white border border-[#E0DDD6] rounded-2xl p-5 flex flex-col">
            <div className="w-10 h-10 bg-[#EDE9FF] rounded-xl flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#6c63ff]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-1.5">Formatted PDF</h3>
            <p className="text-[12px] text-[#6B7280] leading-relaxed flex-1 mb-4">
              Print-ready clinical note with audit footer on every page.
            </p>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="w-full bg-[#1A1A1A] text-white text-[14px] font-medium py-2.5 rounded-full hover:bg-black transition-colors disabled:opacity-60"
            >
              {pdfLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </span>
              ) : 'Download PDF'}
            </button>
            <p className="text-[11px] text-[#9CA3AF] text-center mt-2">Audit footer included</p>
          </div>

          {/* FHIR JSON */}
          <div className="bg-white border border-[#E0DDD6] rounded-2xl p-5 flex flex-col">
            <div className="w-10 h-10 bg-[#EDE9FF] rounded-xl flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#6c63ff]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-1.5">FHIR R4 JSON</h3>
            <p className="text-[12px] text-[#6B7280] leading-relaxed flex-1 mb-4">
              Machine-readable DocumentReference bundle for EHR API integration.
            </p>
            <button
              className="w-full bg-[#1A1A1A] text-white text-[14px] font-medium py-2.5 rounded-full hover:bg-black transition-colors disabled:opacity-60"
              onClick={handleDownloadFHIR}
              disabled={fhirLoading}
            >
              {fhirLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Building...
                </span>
              ) : 'Download JSON'}
            </button>
            <p className="text-[11px] text-[#9CA3AF] text-center mt-2">FHIR R4 compliant</p>
          </div>

          {/* Plain text */}
          <div className="bg-white border border-[#E0DDD6] rounded-2xl p-5 flex flex-col">
            <div className="w-10 h-10 bg-[#EDE9FF] rounded-xl flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#6c63ff]" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-1.5">Plain text</h3>
            <p className="text-[12px] text-[#6B7280] leading-relaxed flex-1 mb-4">
              Paste directly into any EHR — no special formatting.
            </p>
            <button
              className="w-full border border-[#1A1A1A] text-[#1A1A1A] text-[14px] font-medium py-2.5 rounded-full hover:bg-[#F5F5F5] transition-colors"
              onClick={handleCopyText}
            >
              {copyDone ? '✓ Copied!' : 'Copy to clipboard'}
            </button>
            <p className="text-[11px] text-[#9CA3AF] text-center mt-2">No formatting</p>
          </div>
        </div>

        {/* ── FHIR metadata preview ── */}
        <div className="bg-[#1A1A1A] rounded-2xl px-6 py-5 mb-8">
          <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">FHIR R4 Bundle preview</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Resource type', 'Bundle (document)'],
              ['FHIR version', '4.0.1'],
              ['Session ID', id],
              ['Entries', `${4 + (reviewPackage.diagnosisSuggestions?.length ?? 0) + confirmedFlags.length + 1} resources`],
              ['Includes', 'DocumentReference · Observations · Conditions'],
              ['Standard', 'US Core 5.0.1'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[11px] text-[#6B7280]">{k}</p>
                <p className="text-[13px] font-medium text-[#D1D5DB]">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Start new session ── */}
        <div className="text-center">
          <button
            onClick={() => { reset(); router.push('/session/new'); }}
            className="border border-[#1A1A1A] text-[#1A1A1A] text-[14px] font-medium px-8 py-3 rounded-full hover:bg-[#F5F5F5] transition-colors"
          >
            Start new session →
          </button>
          <p className="text-[12px] text-[#9CA3AF] mt-4 max-w-sm mx-auto leading-relaxed">
            AI-assisted note. Reviewed and approved by clinician.
            This tool does not replace clinical judgment.
          </p>
        </div>

      </div>
    </main>
  );
}
