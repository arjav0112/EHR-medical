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
  risk_flags: 'Risk Flags',
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
    <div className="border-l-4 border-[#F59E0B] bg-[#FFFBEB] rounded-r-xl px-4 py-3 flex items-start gap-3">
      {/* Icon */}
      <svg
        className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#92400E] leading-snug">
          <strong>{sLabel}</strong> was generated before{' '}
          <strong>{uLabel}</strong> was updated. Regenerating is recommended.
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={onRegenerate}
            className="text-[12px] font-semibold bg-[#F59E0B] text-white px-3 py-1 rounded-full hover:bg-[#D97706] transition-colors"
          >
            Regenerate {sLabel}
          </button>
          <button
            onClick={onKeep}
            className="text-[12px] font-semibold text-[#92400E] px-3 py-1 rounded-full border border-[#F59E0B] hover:bg-[#FEF3C7] transition-colors"
          >
            Keep current
          </button>
        </div>
      </div>
    </div>
  );
}
