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
    <div className="glass-card border-l-4 border-amber-500 bg-amber-500/5 px-6 py-6 flex items-start gap-5 animate-in slide-in-from-left-4 duration-500">
      <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Structural Dependency Alert</h4>
        <p className="text-[14px] text-amber-800 leading-relaxed">
          The <span className="text-amber-900 font-bold">{sLabel}</span> block was initialized prior to the update in <span className="text-amber-900 font-bold">{uLabel}</span>. Synchronizing neural context is highly recommended.
        </p>
        
        <div className="flex gap-4 mt-6">
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 text-[11px] font-bold bg-amber-500 text-navy-950 px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
            </svg>
            Initialize Synchronization
          </button>
          <button
            onClick={onKeep}
            className="text-[11px] font-bold text-amber-500 border border-amber-500/30 px-5 py-2.5 rounded-xl hover:bg-amber-500/10 transition-all uppercase tracking-widest"
          >
            Retain Version
          </button>
        </div>
      </div>
    </div>
  );
}
