'use client';

// This file is intentionally NOT re-exported as a server component.
// It's only ever loaded via dynamic(() => import('./PDFPreviewClient'), { ssr: false })
// which means @react-pdf/renderer runs exclusively in the browser.

import { BlobProvider } from '@react-pdf/renderer';
import { ClinicalNotePDF } from '@/components/pdf/ClinicalNotePDF';
import type { ReviewPackage } from 'agents';

interface PDFPreviewClientProps {
  reviewPackage: ReviewPackage;
  sessionId: string;
  clinicianNote?: string;
}

function Spinner() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 bg-gray-50">
      <svg className="w-8 h-8 text-gray-300 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <p className="text-[13px] text-gray-400 font-medium">Compiling PDF…</p>
    </div>
  );
}

export default function PDFPreviewClient({
  reviewPackage,
  sessionId,
  clinicianNote = '',
}: PDFPreviewClientProps) {
  return (
    <div className="h-full flex flex-col bg-white">
      <BlobProvider
        document={
          <ClinicalNotePDF
            reviewPackage={reviewPackage}
            sessionId={sessionId}
            clinicianNote={clinicianNote}
          />
        }
      >
        {({ url, loading, error }) => {
          if (loading || !url) return <Spinner />;
          if (error) return (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <p className="text-[13px] font-semibold text-red-500">PDF render failed</p>
              <p className="text-[11px] text-gray-400 font-mono">{error.message}</p>
            </div>
          );
          return (
            <iframe
              src={`${url}#zoom=75`}
              className="w-full h-full border-none"
              title="Clinical Note PDF Preview"
              style={{ background: '#ffffff' }}
            />
          );
        }}
      </BlobProvider>
    </div>
  );
}
