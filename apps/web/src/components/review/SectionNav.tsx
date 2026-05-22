'use client';

import { useRouter } from 'next/navigation';
import { useSessionStore, selectAllApproved, type SectionKey } from '@/lib/store/sessionStore';

const MENU_SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'risk_flags',
    label: 'Risk Flags',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
];

const SOAP_SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'subjective',
    label: 'Subjective',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    key: 'objective',
    label: 'Objective',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'assessment',
    label: 'Assessment',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    key: 'plan',
    label: 'Plan',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

const DEPENDENCIES: Partial<Record<SectionKey, string>> = {
  assessment: 'Requires Subjective + Objective',
  plan: 'Requires Assessment',
};

function NavItem({
  sectionKey,
  label,
  icon,
  isActive,
  isLocked,
  isApproved,
  isRevised,
  isEdited,
  badge,
  depNote,
  onClick,
}: {
  sectionKey: SectionKey;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isLocked: boolean;
  isApproved: boolean;
  isRevised: boolean;
  isEdited: boolean;
  badge?: number;
  depNote?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      title={isLocked && depNote ? depNote : undefined}
      className={`
        group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl
        text-left transition-all duration-200 cursor-pointer
        ${isActive
          ? 'bg-[#1a9e8f] text-white shadow-sm'
          : isLocked
            ? 'opacity-40 cursor-not-allowed text-gray-400'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Icon */}
        <span
          className={`flex-shrink-0 transition-colors ${
            isActive ? 'text-white' : isApproved ? 'text-[#1a9e8f]' : 'text-gray-400 group-hover:text-gray-600'
          }`}
        >
          {isLocked ? (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : isApproved && !isActive ? (
            <svg className="w-[18px] h-[18px] text-[#1a9e8f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            icon
          )}
        </span>

        {/* Label + dep note */}
        <div className="min-w-0">
          <span className={`text-[13.5px] font-semibold block leading-tight ${isActive ? 'text-white' : ''}`}>
            {label}
          </span>
          {isLocked && depNote && (
            <span className="text-[10px] text-gray-400 block mt-0.5 leading-tight">{depNote}</span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {badge !== undefined && badge > 0 && !isActive && (
          <span className="text-[10px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {badge}
          </span>
        )}
        {badge !== undefined && badge > 0 && isActive && (
          <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {badge}
          </span>
        )}
        {isRevised && !isActive && (
          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full">
            Revised
          </span>
        )}
        {isEdited && !isActive && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
            Edited
          </span>
        )}
        {isApproved && !isActive && (
          <span className="text-[10px] font-bold text-[#1a9e8f] bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full">
            Done
          </span>
        )}
        {/* Active chevron */}
        {isActive && (
          <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </button>
  );
}

export default function SectionNav({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { activeSection, setActiveSection, sectionStatuses, reviewPackage } = useSessionStore();
  const allApproved = useSessionStore(selectAllApproved);

  const riskCount = reviewPackage?.riskFlags?.length ?? 0;
  const approvedCount = Object.values(sectionStatuses).filter((s) => s === 'approved').length;
  const processingMs = reviewPackage?.agentMetadata?.processingTimeMs;
  const qualityScore = reviewPackage?.agentMetadata?.transcriptQualityScore;

  const allSections = [...MENU_SECTIONS, ...SOAP_SECTIONS];

  return (
    <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-[290px] z-40 p-3">
      <div
        className="flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.07)] h-full"
      >
        {/* ── Logo */}
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 bg-[#1a9e8f] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-gray-900 tracking-tight">EHR Copilot</span>
        </div>

        {/* ── Search bar */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[12px] text-gray-400 flex-1 select-none">Search sections…</span>
            <span className="text-[10px] text-gray-300 font-mono bg-gray-100 border border-gray-200 rounded px-1 py-0.5 flex-shrink-0">⌘K</span>
          </div>
        </div>

        {/* ── Nav items — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-hide">

          {/* Group 1: Priority */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 px-1 mb-2">Priority</p>
            <div className="space-y-2">
              {MENU_SECTIONS.map(({ key, label, icon }) => {
                const status = sectionStatuses[key];
                return (
                  <NavItem
                    key={key}
                    sectionKey={key}
                    label={label}
                    icon={icon}
                    isActive={activeSection === key}
                    isLocked={status === 'locked'}
                    isApproved={status === 'approved'}
                    isRevised={status === 'revised'}
                    isEdited={status === 'edited'}
                    badge={key === 'risk_flags' ? riskCount : undefined}
                    depNote={DEPENDENCIES[key]}
                    onClick={() => { if (status !== 'locked') setActiveSection(key); }}
                  />
                );
              })}
            </div>
          </div>

          {/* Group 2: Clinical Sections */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 px-1 mb-2">Clinical Sections</p>
            <div className="space-y-2">
              {SOAP_SECTIONS.map(({ key, label, icon }) => {
                const status = sectionStatuses[key];
                return (
                  <NavItem
                    key={key}
                    sectionKey={key}
                    label={label}
                    icon={icon}
                    isActive={activeSection === key}
                    isLocked={status === 'locked'}
                    isApproved={status === 'approved'}
                    isRevised={status === 'revised'}
                    isEdited={status === 'edited'}
                    depNote={DEPENDENCIES[key]}
                    onClick={() => { if (status !== 'locked') setActiveSection(key); }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom panel */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-4 space-y-4">
          {/* Export or Progress */}
          {allApproved ? (
            <button
              onClick={() => router.push(`/session/${sessionId}/export`)}
              className="w-full group flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a9e8f] text-white text-[12.5px] font-bold rounded-xl hover:bg-[#158a7c] transition-colors duration-200 shadow-sm"
            >
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Documentation
            </button>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-semibold text-gray-400">Review Progress</span>
                <span className="text-[11px] font-bold text-gray-700">
                  {approvedCount} <span className="text-gray-400 font-normal">/ 5</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1a9e8f] rounded-full transition-all duration-700"
                  style={{ width: `${(approvedCount / 5) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Metadata stats */}
          <div className="divide-y divide-gray-100/50 border-t border-gray-100/50 pt-2">
            {[
              {
                label: 'Processing Time',
                value: processingMs ? `${(processingMs / 1000).toFixed(1)}s` : '—',
                icon: (
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                label: 'Transcript Quality',
                value: qualityScore ? `${Math.round(qualityScore * 100)}%` : '—',
                icon: (
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
              },
              {
                label: 'AI Model',
                value: 'Gemini 2.5',
                icon: (
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-[11px] text-gray-400 font-semibold">{label}</span>
                </div>
                <span className="text-[11px] font-bold text-gray-600 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
