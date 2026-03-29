'use client';

import { useRouter } from 'next/navigation';
import { useSessionStore, selectAllApproved, type SectionKey } from '@/lib/store/sessionStore';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'risk_flags', label: 'Risk flags' },
  { key: 'subjective', label: 'Subjective' },
  { key: 'objective', label: 'Objective' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'plan', label: 'Plan' },
];

// What must be approved before each section unlocks
const DEPENDENCIES: Partial<Record<SectionKey, string>> = {
  assessment: 'Approve Subjective + Objective first',
  plan: 'Approve Assessment first',
};

const STATUS_STYLE: Record<string, { border: string; dot: string; badge?: string; badgeText?: string }> = {
  draft:    { border: 'border-l-[#d1d5db]', dot: 'bg-[#d1d5db]' },
  approved: { border: 'border-l-[#10b981]', dot: 'bg-[#10b981]', badge: 'text-[#10b981]', badgeText: 'Approved' },
  edited:   { border: 'border-l-[#6c63ff]', dot: 'bg-[#6c63ff]', badge: 'text-[#6c63ff]', badgeText: 'Edited' },
  revised:  { border: 'border-l-[#6c63ff]', dot: 'bg-[#6c63ff]', badge: 'text-[#6c63ff]', badgeText: 'Revised' },
  locked:   { border: 'border-l-[#d1d5db]', dot: 'bg-[#d1d5db]' },
};

export default function SectionNav({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { activeSection, setActiveSection, sectionStatuses, reviewPackage } = useSessionStore();
  const allApproved = useSessionStore(selectAllApproved);

  const riskCount = reviewPackage?.riskFlags?.length ?? 0;

  return (
    <aside className="w-[300px] bg-white border-r border-[#f0efe9] flex flex-col flex-shrink-0 overflow-y-auto">
      {/* Section label */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#9ca3af]">Sections</p>
      </div>

      {/* Section items */}
      <nav className="flex-1">
        {SECTIONS.map(({ key, label }) => {
          const status = sectionStatuses[key];
          const isActive = activeSection === key;
          const isLocked = status === 'locked';
          const isDep = DEPENDENCIES[key];
          const style = STATUS_STYLE[status] ?? STATUS_STYLE.draft;

          return (
            <button
              key={key}
              onClick={() => {
                if (!isLocked) setActiveSection(key);
              }}
              title={isLocked && isDep ? isDep : undefined}
              className={`w-full text-left flex items-center justify-between h-14 px-5 border-l-[3px] transition-colors
                ${style.border}
                ${isActive ? 'bg-[#f5f3ff]' : 'hover:bg-[#f9f9f9]'}
                ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-2.5">
                {isLocked ? (
                  <span className="text-[#9ca3af]">🔒</span>
                ) : (
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                )}
                <span className={`text-[14px] ${isActive ? 'font-semibold text-[#0f0f0f]' : 'text-[#0f0f0f]'}`}>
                  {label}
                </span>
                {/* Risk count badge */}
                {key === 'risk_flags' && riskCount > 0 && (
                  <span className="bg-[#fef2f2] text-[#ef4444] text-[11px] font-medium px-1.5 py-0.5 rounded-full">
                    ({riskCount})
                  </span>
                )}
              </div>

              {/* Status badge right side */}
              <div className="text-right">
                {isLocked && isDep ? (
                  <span className="text-[10px] text-[#9ca3af] leading-tight block max-w-[100px] text-right">
                    {isDep}
                  </span>
                ) : style.badgeText ? (
                  <span className={`text-[11px] font-medium ${style.badge}`}>
                    {status === 'approved' ? '✓ ' : ''}{style.badgeText}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Finalise CTA — shown only when every section is approved */}
      {allApproved && (
        <div className="px-4 py-3 border-t border-[#f0efe9]">
          <button
            onClick={() => router.push(`/session/${sessionId}/export`)}
            className="w-full flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-semibold py-2.5 rounded-full transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Finalize &amp; Export
          </button>
          <p className="text-[10px] text-[#9CA3AF] text-center mt-1.5">All sections approved</p>
        </div>
      )}

      {/* Divider + Agent metadata */}
      <div className="border-t border-[#f0efe9] mt-2">
        <details className="group">
          <summary className="px-5 py-4 flex items-center justify-between cursor-pointer select-none list-none">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#9ca3af]">
              Agent metadata
            </span>
            <span className="text-[#9ca3af] text-xs group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="px-5 pb-4 space-y-2">
            {[
              { label: 'Processing time', value: `${reviewPackage?.agentMetadata?.processingTimeMs ? (reviewPackage.agentMetadata.processingTimeMs / 1000).toFixed(1) : '—'}s` },
              { label: 'Transcript quality', value: reviewPackage?.agentMetadata?.transcriptQualityScore ? `${Math.round(reviewPackage.agentMetadata.transcriptQualityScore * 100)}%` : '—' },
              { label: 'Agents invoked', value: '4' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-[12px]">
                <span className="text-[#9ca3af]">{label}</span>
                <span className="text-[#0f0f0f] font-medium">{value}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </aside>
  );
}
