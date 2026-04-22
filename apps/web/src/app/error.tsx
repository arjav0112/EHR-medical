'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { useSessionStore } from '@/lib/store/sessionStore';


export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router   = useRouter();
  const { reset: resetStore } = useSessionStore();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const handleStartOver = () => {
    resetStore();
    router.push('/session/new');
  };

  // NOTE: route-level error.tsx must NOT include <html>/<body> tags.
  // Only global-error.tsx (which replaces the root layout) may use them.
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-6">
      <div className="max-w-[480px] w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-7 h-7 text-[#EF4444]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>

        <h1 className="text-[28px] font-extrabold text-[#1A1A1A] tracking-tight mb-3">
          Something went wrong with EHR Copilot
        </h1>
        <p className="text-[15px] text-[#6B7280] leading-relaxed mb-6">
          An unexpected error occurred. Your session data may still be intact — try again before starting over.
        </p>

        {/* Error detail */}
        <div className="bg-[#1A1A1A] rounded-xl px-4 py-3 text-left mb-8">
          <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">Error detail</p>
          <code className="text-[12px] text-[#EF4444] font-mono leading-relaxed break-all">
            {error.message || 'An unexpected error occurred.'}
          </code>
          {error.digest && (
            <p className="text-[10px] text-[#6B7280] font-mono mt-2">Digest: {error.digest}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-[#6c63ff] text-white text-[14px] font-semibold px-6 py-2.5 rounded-full hover:bg-[#5a52d5] transition-colors"
          >
            Try again
          </button>
          <button
            onClick={handleStartOver}
            className="border border-[#E0DDD6] text-[#1A1A1A] text-[14px] font-medium px-6 py-2.5 rounded-full hover:bg-[#F5F5F5] transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}
