'use client';

import { useRouter } from 'next/navigation';
import { useSessionStore, selectAllApproved, type SectionKey } from '@/lib/store/sessionStore';

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: 'risk_flags', label: 'Risk Flags', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { key: 'subjective', label: 'Subjective', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
  { key: 'objective', label: 'Objective', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'assessment', label: 'Assessment', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { key: 'plan', label: 'Plan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
];

const DEPENDENCIES: Partial<Record<SectionKey, string>> = {
  assessment: 'Requires Subjective + Objective',
  plan: 'Requires Assessment',
};

export default function SectionNav({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { activeSection, setActiveSection, sectionStatuses, reviewPackage, input } = useSessionStore();
  const allApproved = useSessionStore(selectAllApproved);

  const riskCount = reviewPackage?.riskFlags?.length ?? 0;
  const approvedCount = Object.values(sectionStatuses).filter((s) => s === 'approved').length;

  const processingMs = reviewPackage?.agentMetadata?.processingTimeMs;
  const qualityScore = reviewPackage?.agentMetadata?.transcriptQualityScore;

  return (
    <aside className="w-[284px] flex-shrink-0">
      <div className="h-full m-4 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.09)] border border-gray-100/80 flex flex-col overflow-y-auto">
        {/* Sidebar header */}
        <div className="px-6 pt-6 pb-5 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-1">Documentation Review</p>
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight">Clinical Sections</h3>
        </div>

        {/* Section items */}
        <nav className="flex-1 p-4 space-y-1">
          {SECTIONS.map(({ key, label, icon }) => {
            const status = sectionStatuses[key];
            const isActive = activeSection === key;
            const isLocked = status === 'locked';
            const isApproved = status === 'approved';
            const isDep = DEPENDENCIES[key];

            return (
              <button
                key={key}
                onClick={() => { if (!isLocked) setActiveSection(key); }}
                title={isLocked && isDep ? isDep : undefined}
                className={`w-full text-left flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-200 border group ${isActive
                  ? 'bg-green-50 border-green-200 shadow-sm'
                  : isLocked
                    ? 'border-transparent opacity-40 cursor-not-allowed'
                    : 'border-transparent hover:bg-gray-50 hover:border-gray-200 cursor-pointer'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? 'bg-green-100' : isApproved ? 'bg-green-50' : 'bg-gray-100'
                    }`}>
                    {isLocked ? (
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : isApproved ? (
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className={`w-3.5 h-3.5 ${isActive ? 'text-green-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                      </svg>
                    )}
                  </div>

                  {/* Label */}
                  <div>
                    <span className={`text-[13px] font-semibold block leading-tight ${isActive ? 'text-green-800' : isLocked ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                      {label}
                    </span>
                    {isLocked && isDep && (
                      <span className="text-[10px] text-gray-400 block mt-0.5">{isDep}</span>
                    )}
                  </div>
                </div>

                {/* Right badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {key === 'risk_flags' && riskCount > 0 && (
                    <span className="text-[10px] font-bold bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full">
                      {riskCount}
                    </span>
                  )}
                  {isApproved && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      Done
                    </span>
                  )}
                  {status === 'revised' && (
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                      Revised
                    </span>
                  )}
                  {status === 'edited' && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      Edited
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Progress + export CTA */}
        <div className="p-5 border-t border-gray-100 space-y-4">
          {allApproved ? (
            <button
              onClick={() => router.push(`/session/${sessionId}/export`)}
              className="w-full relative group px-5 py-3 bg-gray-900 text-white text-[13px] font-bold rounded-2xl hover:bg-green-700 transition-colors duration-300 flex items-center justify-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              <span className="relative z-10">Export Documentation</span>
              <svg className="w-4 h-4 relative z-10 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-semibold text-gray-400">Review Progress</span>
                <span className="text-[12px] font-bold text-gray-700">{approvedCount} <span className="text-gray-400 font-normal">/ 5</span></span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-700"
                  style={{ width: `${(approvedCount / 5) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2 pt-1">
            {[
              { label: 'Processing Time', value: processingMs ? `${(processingMs / 1000).toFixed(1)}s` : '—' },
              { label: 'Transcript Quality', value: qualityScore ? `${Math.round(qualityScore * 100)}%` : '—' },
              { label: 'AI Model', value: 'Gemini 2.5' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[11px] text-gray-400">{label}</span>
                <span className="text-[11px] font-semibold text-gray-600 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
