'use client';

import { useState } from 'react';
import Link from 'next/link';
import HomeNavbar from '@/components/HomeNavbar';
import AuthModal from '@/components/AuthModal';

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-28 pb-16 px-8 overflow-hidden bg-white">
      {/* Green radial glow — behind the right card area */}
      <div
        className="absolute -top-20 -right-20 w-[650px] h-[650px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(134,239,172,0.30) 0%, rgba(255,255,255,0) 65%)' }}
      />

      {/* Large mint-green wash — bottom half, covers dot area like reference */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          height: '60%',
          zIndex: 2,
          background: 'linear-gradient(to top, rgba(220,252,231,0.55) 0%, rgba(240,253,244,0.30) 50%, rgba(255,255,255,0) 100%)',
        }}
      />

      {/* Dot grid — sits ON TOP of the green wash, z-5 */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '0',
          left: '18%',
          width: '40%',
          height: '55%',
          zIndex: 5,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='13' height='13' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.4' fill='%234ade80'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 90% at 55% 75%, rgba(0,0,0,0.9) 0%, transparent 65%)',
          maskImage: 'radial-gradient(ellipse 80% 90% at 55% 75%, rgba(0,0,0,0.9) 0%, transparent 65%)',
        }}
      />

      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
        {/* Left */}
        <div>
          {/* Badge — dark outlined pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white shadow-sm mb-7">
            <span className="text-[13px] font-bold text-gray-800">✦</span>
            <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-[0.1em]">AI-Powered Clinical Documentation</span>
          </div>

          {/* Headline — 58px bold, not extra-black */}
          <h1 className="text-[58px] font-bold text-gray-900 leading-[1.08] tracking-[-0.025em] mb-6">
            AI-Powered
            <br />
            {/* Green bar + highlighted green text — Talynx style */}
            <span className="inline-flex items-center" style={{ gap: 0 }}>
              <span
                style={{ display: 'inline-block', width: '5px', alignSelf: 'stretch', background: '#16a34a', borderRadius: '3px', flexShrink: 0 }}
              />
              <span
                style={{
                  color: '#16a34a',
                  background: 'linear-gradient(90deg, rgba(22,163,106,0.10) 0%, rgba(22,163,106,0.04) 100%)',
                  padding: '4px 14px 4px 12px',
                  borderRadius: '0 6px 6px 0',
                }}
              >
                Clinical Notes
              </span>
            </span>
            <br />
            for Modern
            <br />
            Clinicians
          </h1>

          <p className="text-[16px] text-gray-500 leading-[1.65] mb-9 max-w-[440px]">
            Transform session transcripts into structured SOAP notes, DSM assessments, and risk documentation — in seconds, not hours.
          </p>

          {/* CTAs */}
          <div className="flex flex-row items-center gap-4 mb-10">
            <Link
              href="/session/new"
              className="bg-gray-900 text-white text-[14px] font-semibold px-7 py-3.5 rounded-full hover:bg-gray-800 transition-colors duration-200 shadow-sm"
            >
              Get Started Free
            </Link>
            <Link
              href="#how-it-works"
              className="bg-white text-gray-900 text-[14px] font-semibold px-7 py-3.5 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200 shadow-sm"
            >
              Book a Demo
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center gap-5 text-[13px] text-gray-500 pt-4 border-t border-gray-100">
            {['HIPAA Compliant', 'Secure & Private', 'No credit card'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Right — App mockup (Talynx style) */}
        <div className="relative flex justify-center lg:justify-end" style={{ minHeight: '420px' }}>

          {/* Main white card */}
          <div className="relative w-full max-w-[420px] bg-white rounded-3xl border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.09)] overflow-hidden self-start">

            {/* Card header row */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">AI-Powered Documentation</span>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Export
              </button>
            </div>

            {/* Large green orb/blob area — like Talynx */}
            <div
              className="mx-5 mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, #16a34a 0%, #4ade80 45%, #dcfce7 80%, #f0fdf4 100%)', height: '160px' }}
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>

            {/* Processing bar */}
            <div className="px-5 mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-medium text-gray-600">Processing</span>
                <span className="text-[12px] font-semibold text-gray-500">60%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }} />
              </div>
            </div>

            {/* Avatar skeleton rows */}
            <div className="px-5 pb-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" style={{ opacity: 1 - (i - 1) * 0.25 }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 bg-gray-200 rounded-full" style={{ width: i === 1 ? '65%' : i === 2 ? '80%' : '50%', opacity: 1 - (i - 1) * 0.25 }} />
                    <div className="h-1.5 bg-gray-100 rounded-full" style={{ width: i === 1 ? '45%' : i === 2 ? '55%' : '35%', opacity: 1 - (i - 1) * 0.25 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>



          {/* Floating accuracy card — bottom-left of main card */}
          <div className="absolute bottom-4 -left-8 w-[210px] bg-white rounded-2xl border border-gray-100 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 z-20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-semibold text-green-600 uppercase tracking-[0.1em]">AI Accuracy</span>
            </div>
            <div className="text-[15px] font-bold text-gray-900 mb-1">Talent Accuracy</div>
            <div className="text-[11px] text-gray-400 mb-3">Identify top talent with highly accurate AI analysis.</div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1.5">ACCURACY</div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '98%' }} />
              </div>
              <span className="text-[20px] font-black text-gray-900 leading-none">98%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Trusted By ────────────────────────────────────────────────────────────────
function TrustedBy() {
  const logos = [
    { name: 'Hartford Health',   color: '#2563eb', initial: 'H', quote: '"Cut documentation time by 60%"' },
    { name: 'MindPath Care',     color: '#16a34a', initial: 'M', quote: '"Notes ready before the patient leaves"' },
    { name: 'Talkiatry',         color: '#7c3aed', initial: 'T', quote: '"3× faster SOAP generation"' },
    { name: 'Brightside',        color: '#ea580c', initial: 'B', quote: '"Clinicians love the accuracy"' },
    { name: 'Headspace Health',  color: '#0891b2', initial: 'H', quote: '"Screened 1,000+ sessions in a week"' },
    { name: 'Spring Health',     color: '#15803d', initial: 'S', quote: '"From 80 min notes to under 10 min"' },
    { name: 'Alma',              color: '#db2777', initial: 'A', quote: '"Our gold standard for documentation"' },
    { name: 'Lyra Health',       color: '#0284c7', initial: 'L', quote: '"Zero compliance issues since launch"' },
  ];

  // Duplicate for seamless scroll
  const track = [...logos, ...logos];

  return (
    <section className="py-12 border-b border-gray-100 bg-white overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="flex items-center gap-8">

          {/* Left: title + description */}
          <div className="flex-shrink-0 w-[200px]">
            <p className="text-[15px] font-bold text-gray-900 mb-2">Trusted Worldwide</p>
            <p className="text-[12px] text-gray-500 leading-snug">
              From solo practices to global enterprise health systems.
            </p>
          </div>

          {/* Vertical divider */}
          <div className="w-px self-stretch bg-gray-200 flex-shrink-0" style={{ minHeight: '72px' }} />

          {/* Marquee track */}
          <div className="flex-1 overflow-hidden relative">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, #ffffff, transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to left, #ffffff, transparent)' }} />

            <div
              className="flex gap-4"
              style={{
                animation: 'marquee 28s linear infinite',
                width: 'max-content',
              }}
            >
              {track.map(({ name, color, initial, quote }, i) => (
                <div
                  key={`${name}-${i}`}
                  className="flex-shrink-0 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm"
                  style={{ minWidth: '180px' }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[12px] flex-shrink-0"
                      style={{ background: color }}
                    >
                      {initial}
                    </div>
                    <span className="text-[13px] font-bold text-gray-800 truncate">{name}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 italic leading-snug">{quote}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}


// ─── Features / Problem Section ────────────────────────────────────────────────
function FeaturesSection() {
  return (
    <section id="how-it-works" className="py-24 px-8 bg-white">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-[40px] font-bold text-gray-900 tracking-[-0.025em] mb-4">
            Everything You Need to Document Smarter
          </h2>
          <p className="text-[16px] text-gray-500 max-w-xl mx-auto leading-relaxed">
            AI tools that streamline clinical documentation, enhance note accuracy, and give you your time back.
          </p>
        </div>

        {/* Top row — 3 columns */}
        <div className="grid grid-cols-3 gap-5 mb-5">

          {/* Card 1 — SOAP Generation (green gradient bg, visual on top) */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
            {/* Visual area — dark green gradient */}
            <div
              className="relative p-5 flex items-end justify-center"
              style={{
                background: 'linear-gradient(160deg, #15803d 0%, #22c55e 45%, #bbf7d0 80%, #f0fdf4 100%)',
                minHeight: '220px',
              }}
            >
              {/* White sub-card inside gradient */}
              <div className="w-full bg-white rounded-xl border border-green-100 p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-gray-700">AI SOAP Generator</span>
                </div>
                <div className="space-y-1.5">
                  {['Subjective', 'Objective', 'Assessment'].map((item) => (
                    <div key={item} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                      <div className="w-4 h-4 bg-green-500 rounded-md flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Text area — white bg */}
            <div className="bg-white p-5 flex-1">
              <h3 className="text-[17px] font-bold text-gray-900 mb-2">AI SOAP Note Generation</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Quickly analyze and structure session data into full SOAP notes. Our AI comprehends clinical context, sentiment, and risk markers beyond just keywords.
              </p>
            </div>
          </div>

          {/* Card 2 — AI Session Assistant (white bg, dark header) */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
            {/* Visual area — light gray */}
            <div className="relative p-5 bg-gray-50 flex flex-col gap-3" style={{ minHeight: '220px' }}>
              {/* Dark header bar */}
              <div className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-white">Ask AI Assistant</span>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
              {/* Content skeleton */}
              <div className="flex-1 space-y-2 px-1">
                <div className="h-2 bg-gray-200 rounded w-full" />
                <div className="h-2 bg-gray-200 rounded w-5/6" />
                <div className="h-2 bg-gray-200 rounded w-4/6" />
              </div>
              {/* Input row */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 mt-auto">
                <span className="text-[11px] text-gray-400 flex-1">Ask anything about this session...</span>
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            {/* Text area */}
            <div className="bg-white p-5 flex-1">
              <h3 className="text-[17px] font-bold text-gray-900 mb-2">AI Session Assistant</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Real-time clinical support with contextual prompts, risk flag detection, and DSM-5 alignment during and after your sessions.
              </p>
            </div>
          </div>

          {/* Card 3 — Workflow Automation (plain white, text only + icon grid) */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white p-6 flex flex-col">
            <h3 className="text-[20px] font-bold text-gray-900 mb-3">Workflow Automation</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
              Save hours by automating repetitive documentation tasks—from SOAP note generation to PDF export and FHIR-ready data.
            </p>
            {/* Flow diagram */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              {[
                { label: 'Session Transcript', icon: '📋' },
                { label: 'AI Processing', icon: '⚡', green: true },
                { label: 'Structured Output', icon: '✅' },
              ].map(({ label, icon, green }, i) => (
                <div key={label} className="w-full">
                  <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-[12px] font-medium
                    ${green ? 'bg-green-600 text-white border-green-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                    <span>{icon}</span>{label}
                  </div>
                  {i < 2 && <div className="flex justify-center my-1"><div className="w-px h-4 bg-green-300" /></div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row — wide risk card + green card */}
        <div className="grid grid-cols-3 gap-5">

          {/* Card 4 — Smart Risk Assessment (spans 2 cols) */}
          <div className="col-span-2 rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden flex">
            {/* Left: title */}
            <div className="w-[220px] flex-shrink-0 p-6 flex flex-col justify-center border-r border-gray-100">
              <h3 className="text-[20px] font-bold text-gray-900 mb-3">Smart Risk Assessment</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Receive instant risk scores based on clinical indicators, with clear breakdowns your team can act on.
              </p>
            </div>
            {/* Right: sliders UI */}
            <div className="flex-1 p-5">
              <div className="flex gap-2 mb-4">
                {['Risk Vectors', 'DSM-5 Alignment'].map((tab, i) => (
                  <button key={tab} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors
                    ${i === 0 ? 'bg-gray-900 text-white' : 'text-gray-500'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-gray-400 mb-4">Clinical risk factors with weighted severity scores</p>
              {[
                { label: 'Suicidality', pct: 30, color: 'bg-blue-400' },
                { label: 'Affect Dysregulation', pct: 55, color: 'bg-violet-400' },
                { label: 'Protective Factors', pct: 72, color: 'bg-green-500' },
              ].map(({ label, pct, color }) => (
                <div key={label} className="flex items-center gap-3 mb-3">
                  <span className="text-[12px] text-gray-600 w-36 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] font-semibold text-gray-500 w-8 text-right">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5 — FHIR/Export (green gradient, matches card 1 style) */}
          <div
            className="rounded-2xl overflow-hidden border border-green-100 shadow-sm flex flex-col justify-end p-6"
            style={{ background: 'linear-gradient(160deg, #15803d 0%, #22c55e 50%, #dcfce7 100%)' }}
          >
            <div className="mt-auto">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-[20px] font-bold text-white mb-2">FHIR-Ready Export</h3>
              <p className="text-[13px] text-green-100 leading-relaxed">
                Export clinical notes as structured PDF, FHIR R4 bundles, or send directly to your EHR system.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}


// ─── Who It's For ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const useCases = [
    {
      title: 'Therapists & Counselors',
      desc: 'Capture therapeutic themes, affect regulation patterns, and treatment goals — automatically.',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      ),
    },
    {
      title: 'Psychiatrists',
      desc: 'Medication management, MSE documentation, and risk assessments woven into every note.',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      ),
    },
    {
      title: 'Primary Care Physicians',
      desc: 'Turn complex histories into clean, concise SOAP notes — without slowing down your workflow.',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      ),
    },
    {
      title: 'Enterprise Health Systems',
      desc: 'Scale across departments with HIPAA-compliant infrastructure and EHR integrations built-in.',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      ),
    },
  ];

  return (
    <section className="py-24 px-8 bg-gray-100/70">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-8 items-center">

          {/* ── Left: Title + CTA ── */}
          <div>
            <p className="text-green-600 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">Built for Clinicians</p>
            <h2 className="text-[36px] font-bold text-gray-900 tracking-[-0.025em] leading-[1.15] mb-5">
              Who is EHR Copilot For?
            </h2>
            <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
              Built to support every stage of care — from solo practices to enterprise health systems.
            </p>
            <Link href="/session/new" className="btn-premium inline-flex">
              Get Started Free
            </Link>
          </div>

          {/* ── Center: Clinical dashboard card ── */}
          <div
            className="relative rounded-3xl overflow-hidden shadow-xl"
            style={{
              background: 'linear-gradient(145deg, #15803d 0%, #22c55e 40%, #86efac 75%, #dcfce7 100%)',
              minHeight: '420px',
            }}
          >
            {/* Inner white card — live session mockup */}
            <div className="absolute inset-4 bg-white/95 rounded-2xl shadow-lg overflow-hidden flex flex-col">
              {/* Browser bar */}
              <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
                <div className="flex gap-1.5">
                  {['bg-red-400', 'bg-yellow-400', 'bg-green-400'].map(c => (
                    <div key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 font-mono">app.ehrcopilot.com/session</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-600 font-semibold">Live</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-4 overflow-hidden">
                {/* Transcript strip */}
                <div className="bg-green-50 border-l-4 border-green-500 px-3 py-2.5 rounded-r-lg mb-4">
                  <p className="text-green-700 text-[9px] font-bold uppercase tracking-wider mb-1">Live Transcript</p>
                  <p className="text-[11px] text-gray-700 italic leading-snug">
                    "I've been struggling to sleep — the anxiety peaks around 2am..."
                  </p>
                </div>

                {/* SOAP grid */}
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2">SOAP Note — AI Generated</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { k: 'S', v: 'Insomnia, anxiety peaks. Reports avoidance behavior...' },
                    { k: 'O', v: 'Appears fatigued. Affect flat. Maintained eye contact.' },
                    { k: 'A', v: 'GAD with comorbid insomnia. Rule out MDD...' },
                    { k: 'P', v: 'CBT-I referral. Sleep hygiene education. F/U in 2wk.' },
                  ].map(({ k, v }) => (
                    <div key={k} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                      <span className="text-green-600 font-black text-[11px]">{k} </span>
                      <span className="text-[10px] text-gray-500 leading-snug">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Risk bar */}
                <div className="flex items-center gap-2 bg-green-600 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-[10px] text-white font-semibold flex-1">Clinical Readiness: Complete</span>
                  <span className="text-[10px] text-green-200">98%</span>
                </div>
              </div>
            </div>

            {/* Stat overlay — bottom-left of gradient card */}
            <div className="absolute bottom-6 left-6 bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl px-4 py-3">
              <p className="text-white font-black text-[28px] leading-none">3×</p>
              <p className="text-white/80 text-[10px] leading-snug mt-0.5">Faster documentation<br />than manual notes.</p>
            </div>
          </div>

          {/* ── Right: 4 use-case cards ── */}
          <div className="space-y-3">
            {useCases.map(({ title, desc, icon }) => (
              <div key={title} className="group bg-white border border-gray-100 hover:border-green-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-default flex gap-4 items-start">
                <div className="w-9 h-9 bg-green-50 group-hover:bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                  <svg className="w-4.5 h-4.5 text-green-600" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {icon}
                  </svg>
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-[12px] text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}




// ─── Specialities / How It Works ───────────────────────────────────────────────
function Specialities() {
  return (
    <section id="for-clinicians" className="py-24 px-8 bg-white">
      <div className="max-w-[1200px] mx-auto text-center">
        <h2 className="text-[38px] font-bold text-gray-900 tracking-[-0.025em] mb-4">
          Making Documentation a Breeze with EHR Copilot
        </h2>
        <p className="text-[15px] text-gray-500 mb-14 max-w-lg mx-auto leading-relaxed">
          From session start to final note, our AI handles the heavy lifting — letting you focus on your patients.
        </p>

        <div className="grid grid-cols-3 gap-5">

          {/* Step 1 — Upload Transcript */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm text-left">
            {/* Green visual area */}
            <div className="p-6 flex items-center justify-center" style={{ background: '#f0fdf4', minHeight: '220px' }}>
              {/* Upload modal mockup */}
              <div className="w-full bg-white rounded-xl border border-gray-200 shadow-md p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-bold text-gray-800">Upload Your Session</span>
                  <span className="text-gray-400 text-[14px] cursor-pointer">×</span>
                </div>
                <p className="text-[10px] text-gray-400 mb-3">Paste or upload your session transcript below.</p>
                <div className="border-2 border-dashed border-gray-200 rounded-lg py-5 flex flex-col items-center gap-1 mb-3">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-[10px] text-gray-400">Drag your file here or click to upload</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Save as draft</span>
                  <button className="bg-green-600 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">Analyze Now</button>
                </div>
              </div>
            </div>
            {/* Text area */}
            <div className="p-5 bg-white">
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-3">
                STEP 1
              </span>
              <h3 className="text-[18px] font-bold text-gray-900 mb-2">Upload Session Transcript</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Securely paste or upload your session transcript. Our AI understands clinical nuances and patient context.
              </p>
            </div>
          </div>

          {/* Step 2 — AI Analysis */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm text-left">
            <div className="p-6 flex flex-col gap-3" style={{ background: '#f0fdf4', minHeight: '220px' }}>
              {/* AI analysis bar */}
              <div className="flex items-center justify-between bg-green-500 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-[12px] font-bold text-white">AI Analysis</span>
                </div>
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* Skeleton lines representing analysis */}
              <div className="bg-white rounded-xl p-4 flex-1 space-y-2.5">
                <div className="h-2 bg-gray-100 rounded w-full" />
                <div className="h-2 bg-gray-100 rounded w-5/6" />
                <div className="h-2 bg-green-100 rounded w-4/6" />
                <div className="h-2 bg-gray-100 rounded w-full" />
                <div className="h-2 bg-gray-100 rounded w-3/6" />
              </div>
            </div>
            <div className="p-5 bg-white">
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-3">
                STEP 2
              </span>
              <h3 className="text-[18px] font-bold text-gray-900 mb-2">AI-Powered Analysis</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Clinical LLMs analyze the transcript, surfacing risk flags and drafting structured SOAP notes with citations.
              </p>
            </div>
          </div>

          {/* Step 3 — Review & Export */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm text-left">
            <div className="p-6 flex items-start justify-center" style={{ background: '#f0fdf4', minHeight: '220px' }}>
              {/* Match scores / export mockup */}
              <div className="w-full bg-white rounded-xl border border-gray-200 shadow-md p-4">
                <p className="text-[11px] font-bold text-gray-800 mb-3">SOAP Note Ready</p>
                {/* Progress bars */}
                <div className="space-y-2.5 mb-3">
                  {[
                    { label: 'Subjective', pct: 100, color: '#22c55e' },
                    { label: 'Objective', pct: 100, color: '#facc15' },
                    { label: 'Assessment', pct: 85, color: '#22c55e' },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-20 flex-shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Export button tooltip */}
                <div className="flex items-center justify-end">
                  <div className="bg-gray-900 text-white text-[10px] font-semibold px-3 py-1 rounded-lg shadow-lg">
                    Export to PDF / EHR
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-white">
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-3">
                STEP 3
              </span>
              <h3 className="text-[18px] font-bold text-gray-900 mb-2">Review &amp; Export Instantly</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Edit AI-generated notes in one click. Export to PDF or sync with your EHR platform — zero friction.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}


// ─── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="relative min-h-[540px] flex flex-col items-center justify-center px-8 pt-24 pb-56"
        style={{
          /* Warm white-to-muted-sage base — matches Talynx's near-white top */
          background: 'linear-gradient(180deg, #ffffff 0%, #f4f7f0 30%, #e8ede0 60%, #d6e0cc 100%)',
        }}
      >
        {/* Mountain image — anchored bottom, shows only in lower half */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('/mountain-cta-v2.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* White mask: covers top 65%, fades to transparent at bottom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #ffffff 30%, rgba(255,255,255,0.88) 52%, rgba(255,255,255,0.35) 72%, rgba(255,255,255,0) 100%)',
          }}
        />

        {/* Content — sits above both layers */}
        <div className="max-w-[680px] mx-auto relative z-10 text-center">
          <h2 className="text-[52px] md:text-[64px] font-bold text-gray-900 tracking-[-0.03em] leading-[1.1] mb-5">
            Start Documenting Smarter Today
          </h2>
          <p className="text-[16px] text-gray-500 mb-10 max-w-[360px] mx-auto leading-relaxed">
            Join thousands of clinicians who have reclaimed their time. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/session/new"
              className="bg-gray-900 text-white text-[14px] font-semibold px-8 py-3.5 rounded-full hover:bg-gray-800 transition-colors duration-200 shadow-sm"
            >
              Get Started Free
            </Link>
            <button className="text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors px-6 py-3.5">
              Request Demo
            </button>
          </div>
          <p className="text-[12px] text-gray-400 mt-6 tracking-wide">
            No credit card required · HIPAA BAA included · 14-day free trial
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    {
      title: 'Product',
      links: ['Features', 'Pricing', 'Integrations', 'Changelog', 'Roadmap', 'API Docs'],
    },
    {
      title: 'Company',
      links: ['About Us', 'Careers', 'Blog', 'Partners', 'Contact Us'],
    },
    {
      title: 'Resources',
      links: ['Help Center', 'Documentation', 'Video Tutorials', 'Community Forum', 'FAQs'],
    },
    {
      title: 'Legal',
      links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR Compliance', 'Security', 'Accessibility'],
    },
  ];

  const socials = [
    { label: 'Facebook', icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z', green: false },
    { label: 'X', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z', green: true },
    { label: 'LinkedIn', icon: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z', green: false },
    { label: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z', green: false },
  ];

  return (
    <footer className="relative overflow-hidden bg-white">
      {/* Mountain continues from CTA — thin strip at top, aggressively fades to white */}
      <div
        className="absolute top-0 left-0 right-0 h-[160px] pointer-events-none"
        style={{
          backgroundImage: "url('/mountain-cta-v2.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-[160px] pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.65) 35%, rgba(255,255,255,0.95) 60%, #ffffff 75%)',
        }}
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-8 pt-10 pb-0">
        {/* Links grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10 pb-12">
          {/* Brand — 2 cols */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <span className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </span>
              <span className="text-[17px] font-bold text-gray-900">EHR Copilot</span>
            </Link>
            <p className="text-[13px] leading-relaxed max-w-[260px] mb-7" style={{ color: '#6b7280' }}>
              Discover an AI-driven clinical documentation platform that helps teams document accurately and efficiently. This innovative solution uses artificial intelligence to simplify clinical workflows.
            </p>
            {/* Social icons */}
            <div className="flex gap-2.5">
              {socials.map(({ label, icon, green }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${green
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'border border-gray-200 text-gray-500 hover:text-white hover:bg-green-600 hover:border-green-600'
                    }`}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* 4 link columns */}
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

        {/* Newsletter card */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-5 mb-8">
          <div>
            <h4 className="text-[18px] font-bold text-gray-900 leading-tight">Subscribe<br />Newsletter</h4>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input
              type="email"
              placeholder="Enter Your Email"
              className="flex-1 md:w-64 px-4 py-3 border border-gray-200 rounded-full text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 bg-white transition-colors"
            />
            <button className="bg-gray-900 text-white text-[13px] font-semibold px-6 py-3 rounded-full hover:bg-gray-800 transition-colors whitespace-nowrap">
              Subscribe Now
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[12px] text-gray-400">© 2026 EHR Copilot Inc. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer hover:border-gray-300 transition-colors">
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

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      <HomeNavbar onLoginClick={() => setShowAuth(true)} />
      <Hero />
      <TrustedBy />
      <FeaturesSection />
      <HowItWorks />
      <Specialities />
      <FinalCTA />
      <Footer />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
