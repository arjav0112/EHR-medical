'use client';

import { use } from 'react';
import SectionNav from '@/components/review/SectionNav';
import SectionContent from '@/components/review/SectionContent';
import { useAuth } from '@/contexts/AuthContext';

function TopBar({ sessionId }: { sessionId: string }) {
  const { user, photoURL } = useAuth();

  const displayName = user?.displayName || 'Clinician';
  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="fixed top-0 left-0 lg:left-[290px] right-0 z-50 h-[56px] bg-white/95 backdrop-blur-sm border-b border-gray-100 flex items-center px-6 gap-3">
      {/* Left side actions (Only back to dashboard button) */}
      <div className="flex items-center gap-2">
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 px-4 py-1.5 rounded-full text-[12.5px] font-medium text-gray-700 shadow-sm cursor-pointer transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </a>
      </div>

      {/* Profile greeting far right */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[12.5px] font-medium text-gray-700 hidden sm:inline">Hello, {displayName}!</span>
        {photoURL ? (
          <img
            src={photoURL}
            alt={initials}
            className="w-8 h-8 rounded-full object-cover border border-white shadow-sm"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#1a9e8f] text-white flex items-center justify-center font-black text-[13px] border border-white shadow-sm">
            {initials[0]}
          </div>
        )}
      </div>
    </header>
  );
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f8fafc] overflow-hidden">
      <TopBar sessionId={sessionId} />

      {/* Two-panel layout — pushed down by topbar, offset by fixed sidebar on desktop */}
      <div className="relative z-10 flex flex-1 flex-col pt-[56px] lg:pl-[290px] overflow-hidden">
        <SectionNav sessionId={sessionId} />
        <SectionContent sessionId={sessionId} />
      </div>
    </div>
  );
}
