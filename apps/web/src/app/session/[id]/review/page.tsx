'use client';

import { use, useState, useEffect, useRef } from 'react';
import SectionNav from '@/components/review/SectionNav';
import SectionContent from '@/components/review/SectionContent';
import { useAuth } from '@/contexts/AuthContext';

function TopBar({ sessionId }: { sessionId: string }) {
  const { user, photoURL, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = user?.displayName || 'Clinician';
  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <div className="ml-auto flex items-center gap-3 relative" ref={dropdownRef}>
        <span className="text-[12.5px] font-medium text-gray-700 hidden sm:inline">Hello, {displayName}!</span>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-8 h-8 rounded-full focus:outline-none cursor-pointer transition-transform hover:scale-105"
        >
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
        </button>

        {/* Dropdown Menu Popup Card */}
        {menuOpen && (
          <div className="absolute right-0 top-[46px] w-[240px] bg-white border border-gray-100 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-50 py-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header info */}
            <div className="px-5 py-2.5">
              <p className="text-[14.5px] font-bold text-slate-800 tracking-tight leading-snug">
                {displayName}
              </p>
              <p className="text-[12px] text-gray-400 truncate mt-0.5 font-normal">
                {user?.email || 'clinician@ehr.com'}
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100/70 my-2" />

            {/* Nav Options */}
            <div className="px-1.5 space-y-0.5">
              <a
                href="/dashboard?tab=account"
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13.5px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-[18px] h-[18px] text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account
              </a>

              <a
                href="/dashboard?tab=settings"
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13.5px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-[18px] h-[18px] text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </a>

              <a
                href="/dashboard"
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13.5px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-[18px] h-[18px] text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                </svg>
                Dashboard
              </a>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100/70 my-2" />

            {/* Sign Out Button */}
            <div className="px-1.5">
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await signOut();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13.5px] font-medium text-red-500 hover:bg-red-50/60 transition-colors cursor-pointer text-left focus:outline-none"
              >
                <svg className="w-[18px] h-[18px] text-red-550 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
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
