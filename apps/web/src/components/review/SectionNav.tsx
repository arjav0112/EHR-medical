'use client';

import { useRouter } from 'next/navigation';
import { useSessionStore, selectAllApproved, type SectionKey } from '@/lib/store/sessionStore';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'risk_flags', label: 'Risk Protocol' },
  { key: 'subjective', label: 'Subjective' },
  { key: 'objective', label: 'Objective' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'plan', label: 'Plan' },
];

// What must be approved before each section unlocks
const DEPENDENCIES: Partial<Record<SectionKey, string>> = {
  assessment: 'Subjective + Objective Required',
  plan: 'Assessment Required',
};

const STATUS_STYLE: Record<string, { border: string; dot: string; text: string; badge?: string; badgeText?: string }> = {
  draft:    { border: 'border-l-navy-800', dot: 'bg-navy-700', text: 'text-navy-500' },
  approved: { border: 'border-l-neon-500', dot: 'bg-neon-500 shadow-[0_0_10px_rgba(190,242,100,0.6)]', text: 'text-neon-400', badge: 'text-neon-400', badgeText: 'Finalized' },
  edited:   { border: 'border-l-cyan-500', dot: 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]', text: 'text-cyan-400', badge: 'text-cyan-400', badgeText: 'Override' },
  revised:  { border: 'border-l-purple-500', dot: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]', text: 'text-purple-400', badge: 'text-purple-400', badgeText: 'Revised' },
  locked:   { border: 'border-l-navy-900', dot: 'bg-navy-900', text: 'text-navy-700' },
};

export default function SectionNav({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { activeSection, setActiveSection, sectionStatuses, reviewPackage } = useSessionStore();
  const allApproved = useSessionStore(selectAllApproved);

  const riskCount = reviewPackage?.riskFlags?.length ?? 0;

  return (
    <aside className="w-[320px] bg-navy-950/40 border-r border-white/5 flex flex-col flex-shrink-0 overflow-y-auto backdrop-blur-3xl relative z-20 scrollbar-hide">
      {/* Decorative top fade */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-navy-950/80 to-transparent pointer-events-none" />

      {/* Section label */}
      <div className="px-8 pt-10 pb-6 relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-navy-500 mb-1">Neural Matrix</p>
        <h3 className="text-white text-lg font-serif font-medium leading-none">Command Center</h3>
      </div>

      {/* Section items */}
      <nav className="flex-1 px-4 space-y-2 relative z-10">
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
              className={`w-full text-left flex items-center justify-between group rounded-xl px-5 py-5 border-l-[3px] transition-all duration-500
                ${isActive ? 'bg-white/[0.05] border-neon-500 shadow-[0_0_40px_rgba(190,242,100,0.05)]' : 'hover:bg-white/[0.02] border-transparent'}
                ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  {isLocked ? (
                    <svg className="w-3.5 h-3.5 text-navy-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  ) : (
                    <>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 block transition-all duration-500 ${style.dot} ${isActive ? 'scale-125' : ''}`} />
                      {isActive && <span className="absolute inset-0 w-2 h-2 rounded-full bg-neon-500 animate-ping opacity-30" />}
                    </>
                  )}
                </div>
                <span className={`text-[13px] font-bold uppercase tracking-widest transition-colors duration-500 ${isActive ? 'text-white' : isLocked ? 'text-navy-800' : 'text-navy-400 group-hover:text-navy-200'}`}>
                  {label}
                </span>
                
                {/* Risk count badge */}
                {key === 'risk_flags' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${riskCount > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-navy-900/50 text-navy-700 border-navy-800'}`}>
                    {riskCount}
                  </span>
                )}
              </div>

              {/* Status badge right side */}
              <div className="text-right">
                {isLocked && isDep ? (
                  <span className="text-[8px] font-bold text-navy-700 uppercase tracking-widest block max-w-[80px] leading-tight">
                    {isDep}
                  </span>
                ) : style.badgeText ? (
                  <div className="flex items-center gap-2">
                    {status === 'approved' && (
                       <svg className="w-3 h-3 text-neon-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${style.badge}`}>
                      {style.badgeText}
                    </span>
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Finalise CTA */}
      <div className="p-8 relative z-10">
        {allApproved ? (
          <div className="space-y-4 animate-in zoom-in-95 duration-500">
            <button
              onClick={() => router.push(`/session/${sessionId}/export`)}
              className="w-full relative group overflow-hidden bg-neon-500 text-navy-950 text-[11px] font-bold uppercase tracking-[0.2em] py-4 rounded-xl transition-all duration-700 shadow-[0_0_40px_rgba(190,242,100,0.2)] hover:shadow-[0_0_60px_rgba(190,242,100,0.4)]"
            >
              <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <div className="flex items-center justify-center gap-2 relative z-10">
                Synchronize Export
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
            </button>
            <p className="text-[9px] font-bold text-neon-500/40 text-center uppercase tracking-widest">Neural Continuity Established</p>
          </div>
        ) : (
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden group transition-all hover:bg-white/[0.04]">
             <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
             <div className="flex justify-between text-[9px] font-bold text-navy-500 uppercase tracking-[0.2em] mb-4">
               <span>Compliance Index</span>
               <span className="text-navy-300 font-mono">{Object.values(sectionStatuses).filter(s => s === 'approved').length} / 5</span>
             </div>
             <div className="h-1.5 bg-navy-900 rounded-full overflow-hidden">
               <div 
                className="h-full bg-gradient-to-r from-navy-700 to-navy-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.05)]" 
                style={{ width: `${(Object.values(sectionStatuses).filter(s => s === 'approved').length / 5) * 100}%` }}
               />
             </div>
          </div>
        )}
      </div>

      {/* Metadata Telemetry */}
      <div className="border-t border-white/5 bg-white/[0.01] transition-colors hover:bg-white/[0.02]">
        <details className="group">
          <summary className="px-8 py-6 flex items-center justify-between cursor-pointer select-none list-none text-[9px] font-bold uppercase tracking-[0.2em] text-navy-600 group-open:text-navy-400 transition-colors">
            Node Telemetry
            <svg className="w-3 h-3 group-open:rotate-180 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </summary>
          <div className="px-8 pb-8 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {[
              { label: 'Latency Index', value: `${reviewPackage?.agentMetadata?.processingTimeMs ? (reviewPackage.agentMetadata.processingTimeMs / 1000).toFixed(1) : '0.0'}s` },
              { label: 'Neural Fidelity', value: reviewPackage?.agentMetadata?.transcriptQualityScore ? `${Math.round(reviewPackage.agentMetadata.transcriptQualityScore * 100)}%` : '98%' },
              { label: 'Active Cluster', value: 'Gemini 2.5 Flash' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-[11px] font-medium border-b border-white/[0.03] pb-2 last:border-0">
                <span className="text-navy-600 uppercase tracking-widest text-[8px] font-bold">{label}</span>
                <span className="text-navy-200 font-mono text-[10px]">{value}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </aside>
  );
}
