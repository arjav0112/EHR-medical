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
    <header className="fixed top-0 left-0 right-0 z-[60] bg-navy-950/20 backdrop-blur-3xl border-b border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
          <span className="w-8 h-8 rounded-lg bg-neon-500 flex items-center justify-center shadow-[0_0_20px_rgba(190,242,100,0.3)] group-hover:scale-105 transition-transform">
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <rect x="3" y="2" width="2" height="10" rx="1" fill="#0A0F1E" />
              <rect x="7" y="2" width="2" height="6" rx="1" fill="#0A0F1E" opacity="0.7" />
              <rect x="11" y="5" width="2" height="7" rx="1" fill="#0A0F1E" opacity="0.5" />
            </svg>
          </span>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-[16px] text-white tracking-tight leading-none">
              EHR <span className="text-neon-500">Copilot</span>
            </span>
            <span className="text-[8px] font-bold text-navy-500 uppercase tracking-[0.3em] mt-0.5">Neural Interface</span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              activePage === label || (href !== '#' && pathname.startsWith(href) && href !== '/');
            return (
              <Link
                key={label}
                href={href}
                className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative group/link ${
                  isActive
                    ? 'text-white'
                    : 'text-navy-400 hover:text-neon-500'
                }`}
              >
                {label}
                <span className={`absolute -bottom-1 left-0 h-[1px] bg-neon-500 transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover/link:w-full'}`} />
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA */}
        <Link
          href="/session/new"
          className="hidden md:inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.2em] px-6 py-2.5 rounded-xl hover:bg-neon-500 hover:text-navy-950 hover:border-transparent transition-all duration-500 group/btn overflow-hidden relative shadow-2xl"
        >
          <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
          <span className="relative z-10 flex items-center gap-2">
            Initialize Session
            <svg className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 group"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'translate-y-2 rotate-45 bg-neon-500' : ''}`} />
          <span className={`block w-4 h-0.5 bg-white group-hover:w-6 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-translate-y-2 -rotate-45 bg-neon-500' : ''}`} />
        </button>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-navy-950 z-[50] flex flex-col px-8 pt-12 gap-8 border-t border-white/5 animate-in slide-in-from-bottom-5 duration-500">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-[20px] font-serif font-medium text-white hover:text-neon-500 transition-colors flex items-center justify-between group"
            >
              {label}
              <span className="w-8 h-[1px] bg-white/10 group-hover:bg-neon-500 group-hover:w-12 transition-all" />
            </Link>
          ))}
          <Link
            href="/session/new"
            onClick={() => setMenuOpen(false)}
            className="mt-8 bg-neon-500 text-navy-950 text-[14px] font-bold uppercase tracking-[0.2em] px-8 py-4 rounded-2xl text-center shadow-[0_0_30px_rgba(190,242,100,0.2)]"
          >
            Start Neural Session
          </Link>
        </div>
      )}
    </header>
  );
}
