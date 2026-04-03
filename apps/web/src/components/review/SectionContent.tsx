'use client';

import { useEffect, useState } from 'react';
import { useSessionStore, type SectionKey } from '@/lib/store/sessionStore';
import { RiskFlagsSection } from './sections/RiskFlagsSection';
import { SOAPSection } from './sections/SOAPSection';
import { SectionSkeleton } from '@/components/ui/Skeleton';

function LockedSection({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-12 glass-card max-w-2xl mx-auto mt-12 border-dashed border-white/10 group">
      <div className="w-20 h-20 bg-navy-900 border border-white/10 rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 group-hover:border-neon-500/50 transition-all duration-500 shadow-2xl relative">
        <div className="absolute inset-0 bg-neon-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        🔒
      </div>
      <h3 className="text-2xl font-serif font-medium text-white mb-4 capitalize">
        Access Denied: {section.replace('_', ' ')}
      </h3>
      <p className="text-[15px] text-navy-400 max-w-md leading-relaxed mx-auto">
        This structural component is locked. Verification and approval of preceding clinical sections is required to initialize this node.
      </p>
      
      <div className="mt-12 flex items-center gap-2 text-navy-600 text-[11px] font-bold uppercase tracking-widest">
        <span className="w-12 h-[1px] bg-white/5" />
        Prerequisite Protocol Active
        <span className="w-12 h-[1px] bg-white/5" />
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
      <main className="flex-1 bg-navy-950/50 overflow-y-auto px-12 py-12 relative z-10">
        <SectionSkeleton />
      </main>
    );
  }

  // No data even after hydration attempt
  if (!reviewPackage) {
    return (
      <main className="flex-1 bg-navy-950/50 overflow-y-auto px-12 py-12 relative z-10">
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
      <main className="flex-1 bg-navy-950/50 overflow-y-auto px-12 py-12 relative z-10">
        <LockedSection section={activeSection} />
      </main>
    );
  }

  // Risk flags section
  if (activeSection === 'risk_flags') {
    const flags = reviewPackage.riskFlags ?? [];
    return (
      <main className="flex-1 bg-navy-950/50 overflow-y-auto px-12 py-12 relative z-10">
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
      <main className="flex-1 bg-navy-950/50 overflow-y-auto px-12 py-12 relative z-10">
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
    <main className="flex-1 bg-navy-950/40 overflow-y-auto px-12 py-12 relative z-10 scrollbar-hide">
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
