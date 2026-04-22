'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // global-error.tsx MUST include <html>/<body> — it replaces the root layout
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#FAFAF8' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <svg width="28" height="28" viewBox="0 0 20 20" fill="#EF4444">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1A1A1A', marginBottom: 12 }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, marginBottom: 8 }}>
              An unexpected error occurred. Our team has been notified automatically.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace', marginBottom: 24 }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{ background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 28px', borderRadius: 999, border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
