'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavProps {
  activePage?: string;
}

const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/session/new', label: 'For Clinicians' },
  { href: '/api-docs', label: 'API Docs' },
  { href: '/demo', label: 'Demo' },
];

export default function Nav({ activePage }: NavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#f0efe9]">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <span className="w-7 h-7 rounded-md bg-[#6c63ff] flex items-center justify-center shadow-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="3" y="2" width="2" height="10" rx="1" fill="white" />
              <rect x="7" y="2" width="2" height="6" rx="1" fill="white" opacity="0.7" />
              <rect x="11" y="5" width="2" height="7" rx="1" fill="white" opacity="0.5" />
            </svg>
          </span>
          <span className="font-semibold text-[15px] text-[#0f0f0f] tracking-tight">
            EHR Copilot
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              activePage === label || (href !== '#' && pathname.startsWith(href) && href !== '/');
            return (
              <Link
                key={label}
                href={href}
                className={`text-sm transition-colors ${
                  isActive
                    ? 'text-[#0f0f0f] font-medium'
                    : 'text-[#6b7280] hover:text-[#0f0f0f]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA */}
        <Link
          href="/session/new"
          className="hidden md:inline-flex bg-[#0f0f0f] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#1a1a1a] transition-colors"
        >
          Start a session
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-[#0f0f0f] transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block w-5 h-0.5 bg-[#0f0f0f] transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-[#0f0f0f] transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {/* Mobile full-screen menu overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white z-40 flex flex-col px-6 pt-8 gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-[18px] font-semibold text-[#0f0f0f] hover:text-[#6c63ff] transition-colors"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/session/new"
            onClick={() => setMenuOpen(false)}
            className="mt-4 bg-[#0f0f0f] text-white text-[15px] font-medium px-6 py-3 rounded-full text-center"
          >
            Start a session
          </Link>
        </div>
      )}
    </header>
  );
}
