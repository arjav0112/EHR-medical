'use client';

import Link from 'next/link';
import HomeNavbar from '@/components/HomeNavbar';
import { useState } from 'react';
import AuthModal from '@/components/AuthModal';

// ─── Footer (minimal, matches homepage) ───────────────────────────────────────
function Footer() {
  const cols = [
    { title: 'Product',  links: ['Features', 'How it Works', 'Pricing', 'Demo'] },
    { title: 'Company',  links: ['About', 'Blog', 'Careers', 'Press'] },
    { title: 'Legal',    links: ['Privacy Policy', 'Terms of Service', 'HIPAA', 'Security'] },
    { title: 'Support',  links: ['Help Center', 'Documentation', 'Status', 'Contact'] },
  ];
  return (
    <footer className="relative overflow-hidden bg-white border-t border-gray-100 mt-auto">
      <div className="relative z-10 max-w-[1200px] mx-auto px-8 pt-10 pb-0">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10 pb-12">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <span className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </span>
              <span className="text-[17px] font-bold text-gray-900">EHR Copilot</span>
            </Link>
            <p className="text-[13px] leading-relaxed max-w-[260px] mb-7 text-gray-500">
              AI-driven clinical documentation platform that helps clinicians document accurately and efficiently.
            </p>
          </div>
          {cols.map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-[14px] font-semibold text-gray-900 mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors duration-200">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="py-5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[12px] text-gray-400">© 2026 EHR Copilot Inc. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">
            <span>🇺🇸</span>
            <span>Prices in:</span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── 404 Page ─────────────────────────────────────────────────────────────────
export default function NotFound() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <HomeNavbar onLoginClick={() => setShowAuth(true)} />

      {/* Hero area */}
      <div className="flex-1 flex items-center justify-center px-8 overflow-hidden relative">

        {/* Background decorations */}
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(134,239,172,0.22) 0%, rgba(255,255,255,0) 65%)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(134,239,172,0.12) 0%, rgba(255,255,255,0) 65%)' }}
        />

        {/* Dot grid */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '0',
            left: '10%',
            width: '35%',
            height: '50%',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='13' height='13' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.4' fill='%234ade80'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 90% at 40% 80%, rgba(0,0,0,0.7) 0%, transparent 65%)',
            maskImage: 'radial-gradient(ellipse 80% 90% at 40% 80%, rgba(0,0,0,0.7) 0%, transparent 65%)',
          }}
        />

        <div className="relative z-10 text-center max-w-[560px] mx-auto py-24">

          {/* 404 badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white shadow-sm mb-8">
            <span className="text-[13px] font-bold text-gray-800">✦</span>
            <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-[0.1em]">Error 404</span>
          </div>

          {/* Big 404 number */}
          <div className="flex items-center justify-center gap-0 mb-6">
            <span className="text-[110px] md:text-[140px] font-bold text-gray-900 leading-none tracking-[-0.04em]">4</span>
            {/* Green O */}
            <span className="relative inline-flex items-center justify-center">
              <span className="text-[110px] md:text-[140px] font-bold leading-none tracking-[-0.04em]"
                style={{
                  color: '#16a34a',
                  background: 'linear-gradient(90deg, rgba(22,163,106,0.10) 0%, rgba(22,163,106,0.04) 100%)',
                  borderRadius: '12px',
                  padding: '0 8px',
                }}>
                0
              </span>
            </span>
            <span className="text-[110px] md:text-[140px] font-bold text-gray-900 leading-none tracking-[-0.04em]">4</span>
          </div>

          <h1 className="text-[28px] md:text-[32px] font-bold text-gray-900 leading-tight mb-4 tracking-[-0.02em]">
            Page not found
          </h1>

          <p className="text-[15px] text-gray-500 leading-[1.7] mb-10 max-w-[420px] mx-auto">
            The clinical route you're looking for doesn't exist or has been moved. Double-check the URL or head back to the dashboard.
          </p>

          {/* CTAs */}
          <div className="flex flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/"
              className="bg-gray-900 text-white text-[14px] font-semibold px-7 py-3.5 rounded-full hover:bg-gray-800 transition-colors duration-200 shadow-sm"
            >
              Back to Home
            </Link>
            <Link
              href="/dashboard"
              className="bg-white text-gray-900 text-[14px] font-semibold px-7 py-3.5 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200 shadow-sm"
            >
              Go to Dashboard
            </Link>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-[13px] text-gray-400 pt-6 border-t border-gray-100">
            {[
              { label: 'New Session', href: '/session/new' },
              { label: 'Demo Mode', href: '/demo' },
              { label: 'Help Center', href: '#' },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-1.5 hover:text-green-600 transition-colors duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
