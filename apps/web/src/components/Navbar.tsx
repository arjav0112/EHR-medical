'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-[rgba(0,0,0,0.06)]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#6c63ff] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M8 3v10" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <circle cx="8" cy="8" r="2" fill="white" />
            </svg>
          </span>
          <span className="font-semibold text-sm text-[#0f0f0f] tracking-tight">
            EHR <span className="text-[#6c63ff]">Copilot</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Home
          </Link>
          <Link href="/session" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            New Session
          </Link>
          <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            History
          </Link>
        </nav>

        {/* CTA */}
        <Link href="/session" className="btn-dark text-xs px-4 py-2">
          Start Session
        </Link>
      </div>
    </header>
  );
}
