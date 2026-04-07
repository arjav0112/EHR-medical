'use client';

import { useEffect, useState } from 'react';
import { useSessionStore, type SectionKey } from '@/lib/store/sessionStore';
import { RiskFlagsSection } from './sections/RiskFlagsSection';
import { SOAPSection } from './sections/SOAPSection';
import { SectionSkeleton } from '@/components/ui/Skeleton';
import type { SessionInput, ReviewPackage } from 'agents';

// function StickyPatientHeader({ input, reviewPackage }: { input: SessionInput | null; reviewPackage: ReviewPackage | null }) {
//   // if (!input \&\& !reviewPackage) return null;
//   const dx = reviewPackage?.diagnosisSuggestions?.[0];
//   const meds = input?.patient?.currentMedications ?? [];
//   return (
//     <div className=" flex-shrink-0 bg-white/95 border-b border-gray-100 px-10 py-2.5 flex items-center gap-4 flex-wrap shadow-sm" />
//  {input && (
//  <span className=\text-[11px] text-gray-500 />
//  <span className=\font-bold text-gray-800\\u003ePatient:</span> {input.patient.age}y · {input.patient.gender}
//  </span>
//  )}
//  </div>
//  );
// }

function PatientContextBar({ input, reviewPackage }: { input: SessionInput | null; reviewPackage: ReviewPackage | null }) {
  if (!input && !reviewPackage) return null;
  const dx = reviewPackage?.diagnosisSuggestions?.[0];
  const meds = input?.patient?.currentMedications ?? [];
  const sessionType = input?.session?.sessionType?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? '';

  return (
    <div className="flex-shrink-0 mx-0 mt-3">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-4 flex items-center gap-6 flex-wrap">
        {/* Patient */}
        {input && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Patient</p>
              <p className="text-[13px] font-semibold text-gray-800">{input.patient.age}y{' · '}{input.patient.gender}{' · '}{sessionType}</p>
            </div>
          </div>
        )}

        {meds.length > 0 && (
          <>
            <div className="w-px h-8 bg-gray-100 flex-shrink-0" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.153-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Medications</p>
                <p className="text-[13px] font-semibold text-gray-800 truncate max-w-[200px]">{meds.join(', ')}</p>
              </div>
            </div>
          </>
        )}

        {dx && (
          <>
            <div className="w-px h-8 bg-gray-100 flex-shrink-0" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span className="font-mono text-purple-500">{dx.dsm5Code}</span>{' · '}{Math.round(dx.confidence * 100)}% confidence
                </p>
                <p className="text-[13px] font-semibold text-gray-800 truncate max-w-[240px]">{dx.label.split(',')[0]}</p>
              </div>
            </div>
          </>
        )}

        {/* Session modality */}
        {input && (
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session #{input.session.sessionNumber}</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span className="text-[10px] font-semibold text-gray-500 capitalize">{input.session.modality.replace('_', ' ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LockedSection({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-12 bg-white border border-gray-100 rounded-2xl shadow-sm max-w-2xl mx-auto mt-12">
      <div className="w-20 h-20 bg-gray-50 border border-gray-200 rounded-3xl flex items-center justify-center text-3xl mb-8">
        ðŸ”’
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-4 capitalize">
        {section.replace('_', ' ')} â€” Locked
      </h3>
      <p className="text-[15px] text-gray-500 max-w-md leading-relaxed">
        Complete and approve the preceding sections to unlock this one.
      </p>
      <div className="mt-10 flex items-center gap-2 text-gray-400 text-[11px] font-semibold uppercase tracking-widest">
        <span className="w-8 h-[1px] bg-gray-200" />
        Prerequisite Required
        <span className="w-8 h-[1px] bg-gray-200" />
      </div>
    </div>
  );
}

export default function SectionContent({ sessionId }: { sessionId: string }) {
  const {
    activeSection,
    sectionStatuses,
    reviewPackage,
    processingStatus,
    input,
    approveSection,
    editSection,
    markRevised,
    updateSectionContent,
    invalidateDownstreamSections,
    setReviewPackage,
    setSessionId,
    setInput,
  } = useSessionStore();

  const [hydrating, setHydrating] = useState(false);
  const [hydrationFailed, setHydrationFailed] = useState(false);

  // â”€â”€ Hydrate from Redis on page refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (reviewPackage || hydrating || hydrationFailed) return;

    setHydrating(true);
    fetch(`/api/session/${sessionId}/review`)
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(({ reviewPackage: pkg, sessionInput }) => {
        setReviewPackage(pkg);
        setSessionId(sessionId);
        if (sessionInput) setInput(sessionInput);
      })
      .catch(() => setHydrationFailed(true))
      .finally(() => setHydrating(false));
  }, [reviewPackage, sessionId, hydrating, hydrationFailed, setReviewPackage, setSessionId]);

  const status = sectionStatuses[activeSection];

  // Loading skeleton during hydration or active processing
  if (!reviewPackage && (processingStatus !== 'idle' || hydrating)) {
    return (
      <main className="flex-1 bg-gray-50/60 overflow-y-auto px-12 py-10 relative z-10">
        <SectionSkeleton />
      </main>
    );
  }

  // No data even after hydration attempt
  if (!reviewPackage) {
    return (
      <main className="flex-1 bg-gray-50/60 overflow-y-auto px-12 py-10 relative z-10">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 font-mono text-xl">!</div>
          <p className="text-[15px] font-medium text-navy-300 max-w-sm leading-relaxed">
            {hydrationFailed
              ? 'Neural session data expired or target nodes not found. Retention protocol: 24h.'
              : 'Protocol Mismatch: No clinical session data available for load.'}
          </p>
        </div>
      </main>
    );
  }


  // Locked gate
  if (status === 'locked') {
    return (
      <main className="flex-1 bg-gray-50/60 overflow-y-auto px-12 py-10 relative z-10">
        <LockedSection section={activeSection} />
      </main>
    );
  }

  // Risk flags section
  if (activeSection === 'risk_flags') {
    const flags = reviewPackage.riskFlags ?? [];
    return (
      <main className="flex-1 overflow-hidden px-10 py-8 pb-4 grid grid-rows-[1fr_auto] gap-3">
        <div className="overflow-y-auto">
          <RiskFlagsSection
            flags={flags}
            onFlagAction={(_flagId, _action) => { }}
            onAllConfirmed={() => { approveSection('risk_flags'); }}
          />
        </div>
        <PatientContextBar input={input} reviewPackage={reviewPackage} />
      </main>
    );
  }

  // SOAP sections
  const soapKey = activeSection as 'subjective' | 'objective' | 'assessment' | 'plan';
  const soapSection = reviewPackage.soapNote?.[soapKey];

  if (!soapSection) {
    return (
      <main className="flex-1 bg-gray-50/60 overflow-hidden px-10 py-8 relative z-10">
        <SectionSkeleton />
      </main>
    );
  }

  // Build approved sections map for revision API
  const approvedSections: Record<string, unknown> = {};
  (Object.keys(sectionStatuses) as SectionKey[]).forEach((k) => {
    if (sectionStatuses[k] === 'approved' && k !== 'risk_flags') {
      const key = k as 'subjective' | 'objective' | 'assessment' | 'plan';
      approvedSections[k] = reviewPackage.soapNote?.[key]?.content ?? '';
    }
  });

  return (
    <main className="flex-1 overflow-hidden px-10 py-8 pb-4 grid grid-rows-[1fr_auto] gap-3">
      <div className="overflow-y-auto">
        <SOAPSection
          key={soapKey}
          section={soapKey}
          soapSection={soapSection}
          transcript={input?.session?.transcript ?? ''}
          approvedSections={approvedSections}
          onApprove={() => approveSection(soapKey)}
          onEdit={(content) => {
            updateSectionContent(soapKey, content);
            editSection(soapKey);
            invalidateDownstreamSections(soapKey);
          }}
          onRevisionComplete={(content) => {
            updateSectionContent(soapKey, content);
            markRevised(soapKey);
          }}
        />
      </div>
      <PatientContextBar input={input} reviewPackage={reviewPackage} />
    </main>
  );
}

