'use client';

import type { SOAPSection } from '@/lib/types';

interface ProvenanceTagProps {
  soapSection: SOAPSection;
}

export function ProvenanceTag({ soapSection }: ProvenanceTagProps) {
  const { provenanceTag, revisionRounds, status } = soapSection;

  // Build human-readable history string
  const buildLabel = (): string => {
    const parts: string[] = ['AI drafted'];
    if (provenanceTag === 'clinician_edited') {
      parts.push('Clinician edited');
    } else if (provenanceTag === 'ai_revised' || revisionRounds > 0) {
      parts.push(`Revised ${revisionRounds}×`);
    }
    if (status === 'approved') parts.push('Approved');
    return parts.join(' → ');
  };

  // Determine pill style
  const style = (): { bg: string; text: string } => {
    if (status === 'approved') {
      if (provenanceTag === 'clinician_edited')
        return { bg: 'bg-blue-100', text: 'text-blue-700' };
      if (revisionRounds > 0 || provenanceTag === 'ai_revised')
        return { bg: 'bg-[#EBD9FF]', text: 'text-[#6c63ff]' };
      return { bg: 'bg-[#D1FAE5]', text: 'text-[#059669]' };
    }
    if (provenanceTag === 'clinician_edited')
      return { bg: 'bg-blue-50', text: 'text-blue-600' };
    if (provenanceTag === 'ai_revised' || revisionRounds > 0)
      return { bg: 'bg-[#EBD9FF]', text: 'text-[#6c63ff]' };
    return { bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]' };
  };

  const { bg, text } = style();

  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full ${bg} ${text}`}>
      {buildLabel()}
    </span>
  );
}
