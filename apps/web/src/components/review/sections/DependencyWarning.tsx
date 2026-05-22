'use client';

interface DependencyWarningProps {
  sectionName: string;
  upstreamSection: string;
  onRegenerate: () => void;
  onKeep: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  subjective: 'Subjective',
  objective: 'Objective',
  assessment: 'Assessment',
  plan: 'Plan',
  risk_flags: 'Risk Assessment',
};

export function DependencyWarning({
  sectionName,
  upstreamSection,
  onRegenerate,
  onKeep,
}: DependencyWarningProps) {
  const sLabel = SECTION_LABELS[sectionName] ?? sectionName;
  const uLabel = SECTION_LABELS[upstreamSection] ?? upstreamSection;

  return (
    <div className="bg-slate-50/70 backdrop-blur-md border border-slate-200/70 rounded-2xl p-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-300 ease-out">
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-250/30 px-2.5 py-0.5 rounded-full select-none">
              Structural Dependency Alert
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <p className="text-[13px] text-slate-650 leading-relaxed font-sans m-0">
            The <span className="text-slate-900 font-extrabold">{sLabel}</span> block was initialized prior to the update in <span className="text-slate-900 font-extrabold">{uLabel}</span>. Synchronizing neural context is highly recommended.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 lg:pl-4">
        <button
          onClick={onRegenerate}
          className="flex items-center gap-2 text-[12px] font-extrabold bg-[#0f172a] hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] whitespace-nowrap flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M3 21v-5h5"/>
          </svg>
          Initialize Synchronization
        </button>
        
        <button
          onClick={onKeep}
          className="text-[12px] font-extrabold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.99] whitespace-nowrap flex-shrink-0"
        >
          Retain Version
        </button>
      </div>
    </div>
  );
}
