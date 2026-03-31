'use client';

import { useEffect, useState } from 'react';
import { useSessionStore, type SectionKey } from '@/lib/store/sessionStore';
import { RiskFlagsSection } from './sections/RiskFlagsSection';
import { SOAPSection } from './sections/SOAPSection';
import { SectionSkeleton } from '@/components/ui/Skeleton';

function LockedSection({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-24">
      <div className="w-14 h-14 bg-[#F3F4F6] rounded-full flex items-center justify-center text-2xl mb-4">
        🔒
      </div>
      <p className="text-[18px] font-semibold text-[#1A1A1A] mb-2 capitalize">
        {section.replace('_', ' ')} locked
      </p>
      <p className="text-[14px] text-[#9CA3AF] max-w-xs leading-relaxed">
        Complete and approve the prerequisite sections to unlock this section.
      </p>
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

  // ── Hydrate from Redis on page refresh ──────────────────────────────────────
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
      <main className="flex-1 bg-[#F8F8F6] overflow-y-auto px-10 py-8">
        <SectionSkeleton />
      </main>
    );
  }

  // No data even after hydration attempt
  if (!reviewPackage) {
    return (
      <main className="flex-1 bg-[#F8F8F6] overflow-y-auto px-10 py-8">
        <div className="flex flex-col items-center justify-center h-full text-center py-24">
          <p className="text-[16px] text-[#9CA3AF]">
            {hydrationFailed
              ? 'Session expired or not found. Sessions are retained for 24 hours.'
              : 'No session data loaded.'}
          </p>
        </div>
      </main>
    );
  }


  // Locked gate
  if (status === 'locked') {
    return (
      <main className="flex-1 bg-[#F8F8F6] overflow-y-auto px-10 py-8">
        <LockedSection section={activeSection} />
      </main>
    );
  }

  // Risk flags section
  if (activeSection === 'risk_flags') {
    const flags = reviewPackage.riskFlags ?? [];
    return (
      <main className="flex-1 bg-[#F8F8F6] overflow-y-auto px-10 py-8">
        <RiskFlagsSection
          flags={flags}
          onFlagAction={(_flagId, _action) => {
            // Flag local state is managed inside RiskFlagsSection
          }}
          onAllConfirmed={() => {
            approveSection('risk_flags');
          }}
        />
      </main>
    );
  }

  // SOAP sections
  const soapKey = activeSection as 'subjective' | 'objective' | 'assessment' | 'plan';
  const soapSection = reviewPackage.soapNote?.[soapKey];

  if (!soapSection) {
    return (
      <main className="flex-1 bg-[#F8F8F6] overflow-y-auto px-10 py-8">
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
    <main className="flex-1 bg-[#F8F8F6] overflow-y-auto px-10 py-8">
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
    </main>
  );
}
