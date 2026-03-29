'use client';

import { useState } from 'react';
import type { ReviewPackage } from 'agents';

interface PDFDownloadButtonProps {
  reviewPackage: ReviewPackage;
  sessionId: string;
  clinicianNote?: string;
  className?: string;
}

export function PDFDownloadButton({
  reviewPackage,
  sessionId,
  clinicianNote,
  className,
}: PDFDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Dynamic import to avoid SSR
      const [{ pdf }, { ClinicalNotePDF }, React] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ClinicalNotePDF'),
        import('react'),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = React.createElement(ClinicalNotePDF as any, {
        reviewPackage,
        sessionId,
        clinicianNote,
      }) as Parameters<typeof pdf>[0];

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clinical-note-${sessionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={
        className ??
        'w-full bg-[#0f0f0f] text-white text-[14px] font-medium py-2.5 rounded-full hover:bg-[#1a1a1a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
      }
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Generating PDF...
        </span>
      ) : (
        'Download PDF'
      )}
    </button>
  );
}
