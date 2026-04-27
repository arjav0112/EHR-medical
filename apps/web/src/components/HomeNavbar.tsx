'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import SettingsModal from '@/components/SettingsModal';

export default function HomeNavbar({ onLoginClick }: { onLoginClick?: () => void }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <header className="fixed top-3 left-0 right-0 z-50 flex justify-center px-4 sm:top-4">
      <div className="flex min-h-[58px] w-full max-w-[860px] items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-[0_2px_20px_rgba(0,0,0,0.10)] sm:h-[58px] sm:rounded-full sm:px-5 sm:py-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <span className="text-[15px] font-bold tracking-tight text-gray-900 sm:text-[16px]">EHR Copilot</span>
        </Link>

        {/* Nav Links — swap "How it Works" for "Dashboard" when logged in */}
        <nav className="hidden md:flex items-center gap-7">
          <a href="#for-clinicians" className="text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">Features</a>
          {user ? (
            <Link href="/dashboard" className="text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">Dashboard</Link>
          ) : (
            <a href="#how-it-works" className="text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">How it Works</a>
          )}
          <Link href="/pricing" className="text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">Pricing</Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!loading && !user && (
            <button
              onClick={onLoginClick}
              className="text-[14px] font-semibold text-gray-700 hover:text-gray-900 transition-colors duration-200 hidden md:block"
            >
              Log in
            </button>
          )}

          {/* Avatar dropdown when logged in */}
          {!loading && user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white text-[13px] font-bold hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-300"
                aria-label="Account menu"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={initials} className="w-9 h-9 rounded-full object-cover" />
                ) : initials}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.13)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User info */}
                  <div className="px-4 py-3.5 border-b border-gray-100">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{user.displayName || 'Clinician'}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                  </div>
                  <div className="py-1.5">
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Clinical Dashboard
                    </Link>
                    <Link
                      href="/session/new"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Session
                    </Link>
                    <button
                      onClick={() => { setMenuOpen(false); setShowSettings(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                      onClick={async () => { setMenuOpen(false); await signOut(); router.push('/'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Link
            href="/session/new"
            className="rounded-full bg-gray-900 px-3.5 py-2 text-[12px] font-semibold text-white transition-colors duration-200 hover:bg-gray-800 sm:px-5 sm:py-2.5 sm:text-[13px]"
          >
            <span className="sm:hidden">Get Started</span>
            <span className="hidden sm:inline">Get Started Free</span>
          </Link>
        </div>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} initialTab="profile" />}
    </header>
  );
}
