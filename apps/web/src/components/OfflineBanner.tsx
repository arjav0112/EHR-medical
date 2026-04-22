'use client';

import { useEffect, useState } from 'react';

type Status = 'online' | 'offline' | 'reconnected';

export default function OfflineBanner() {
  const [status, setStatus] = useState<Status>('online');

  useEffect(() => {
    // Initialise from browser state
    if (!navigator.onLine) setStatus('offline');

    const handleOffline = () => setStatus('offline');
    const handleOnline  = () => {
      setStatus('reconnected');
      // Hide the "back online" flash after 3s
      setTimeout(() => setStatus('online'), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  }, []);

  if (status === 'online') return null;

  return (
    <div
      aria-live="assertive"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg border text-[13px] font-semibold select-none pointer-events-none transition-all duration-300"
      style={{
        background: status === 'offline' ? '#fefce8' : '#f0fdf4',
        borderColor: status === 'offline' ? '#fde047' : '#86efac',
        color:       status === 'offline' ? '#854d0e' : '#166534',
      }}
    >
      {/* Pulsing dot */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: status === 'offline' ? '#eab308' : '#22c55e',
          animation:  status === 'offline' ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      />
      {status === 'offline'
        ? 'You are offline — changes will sync when reconnected'
        : '✓ Back online'}
    </div>
  );
}
