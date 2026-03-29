'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSessionStore } from '@/lib/store/sessionStore';
import { demoReviewPackage } from '@/lib/demo/demoData';

export default function DemoPage() {
  const router = useRouter();
  const { setReviewPackage, setSessionId, setInput, setProcessingStatus } = useSessionStore();

  useEffect(() => {
    // Load demo data directly into Zustand — skips /api/session/process
    setSessionId('demo');
    setProcessingStatus('complete');
    setReviewPackage(demoReviewPackage);
    setInput({
      session: {
        transcript: '',
        sessionNumber: 7,
        sessionType: 'follow_up',
        durationMinutes: 50,
        modality: 'telehealth',
      },
      patient: {
        id: 'anon_demo_001',
        age: 34,
        gender: 'not_specified',
        knownDiagnoses: ['F32.1'],
        currentMedications: ['Sertraline 50mg'],
      },
      priorNotes: [],
      clinicianPreferences: {
        noteVerbosity: 'standard',
        alwaysIncludeRiskSection: true,
      },
    });
  }, [setReviewPackage, setSessionId, setInput, setProcessingStatus]);

  const handleEnter = () => {
    router.push('/session/demo/review');
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* Demo banner */}
      <div className="bg-[#FFF7ED] border-b border-[#FED7AA] px-6 py-3 flex items-center justify-center gap-3">
        <svg className="w-4 h-4 text-[#F59E0B] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <p className="text-[13px] font-semibold text-[#92400E]">
          Demo mode — You are viewing a synthetic session. No real patient data is used.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-[560px] text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#F3F4F6] border border-[#E5E7EB] rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Demo session</span>
          </div>

          <h1 className="text-[42px] font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-4">
            Try the full review experience
          </h1>
          <p className="text-[16px] text-[#6B7280] leading-relaxed mb-8 max-w-[440px] mx-auto">
            This demo loads a synthetic therapy session with realistic clinical content.
            All features — risk flags, revision, approval, and export — are fully functional.
          </p>

          {/* What's included */}
          <div className="bg-white border border-[#E0DDD6] rounded-2xl px-6 py-5 text-left mb-8 space-y-3">
            <p className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">What&apos;s included</p>
            {[
              ['🧠', 'Patient: anon_demo_001 · Age 34 · Diagnosis: F32.1 (MDD Moderate)'],
              ['⚠️', '2 risk flags: Moderate suicidal ideation + medication non-compliance'],
              ['📄', 'Full SOAP note with varying confidence scores (79%–91%)'],
              ['💊', 'DSM-5 diagnosis match (F32.1) with supporting criteria'],
              ['📋', 'Treatment plan: 2 active goals + new interventions'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-start gap-3">
                <span className="text-[18px] flex-shrink-0">{icon}</span>
                <p className="text-[13px] text-[#4A4A4A] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleEnter}
            className="w-full bg-[#1A1A1A] text-white text-[15px] font-semibold py-4 rounded-full hover:bg-black transition-colors mb-4"
          >
            Enter demo review →
          </button>

          <div className="flex items-center gap-3 justify-center">
            <div className="h-px flex-1 bg-[#E5E7EB]" />
            <span className="text-[12px] text-[#9CA3AF]">or</span>
            <div className="h-px flex-1 bg-[#E5E7EB]" />
          </div>

          <Link
            href="/session/new"
            className="inline-block mt-4 text-[14px] text-[#6c63ff] font-medium hover:underline"
          >
            Try with your own transcript →
          </Link>
        </div>
      </div>
    </main>
  );
}
