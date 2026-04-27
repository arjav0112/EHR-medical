'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSessionStore } from '@/lib/store/sessionStore';
import { AgentProgress } from '@/components/processing/AgentProgress';
import { useAuth } from '@/contexts/AuthContext';
import { checkSessionQuota, syncMonthlySessionUsageForUser } from '@/lib/firebase/users';
import { saveSession } from '@/lib/firebase/sessions';
import type { SessionInput } from 'agents';

// ─── Types ────────────────────────────────────────────────────────────────────
type SessionType = 'intake' | 'follow_up' | 'crisis';
type Modality = 'in_person' | 'telehealth';
type Verbosity = 'concise' | 'standard' | 'detailed';

interface FormState {
  transcript: string;
  sessionNumber: string;
  sessionType: SessionType;
  durationMinutes: string;
  modality: Modality;
  patientId: string;
  age: string;
  knownDiagnoses: string[];
  currentMedications: string[];
  verbosity: Verbosity;
}

interface FormErrors {
  transcript?: string;
  patientId?: string;
  sessionNumber?: string;
  age?: string;
}

const INITIAL_FORM: FormState = {
  transcript: '',
  sessionNumber: '1',
  sessionType: 'follow_up',
  durationMinutes: '50',
  modality: 'in_person',
  patientId: '',
  age: '',
  knownDiagnoses: [],
  currentMedications: [],
  verbosity: 'standard',
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
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
          <span className="text-[16px] font-bold text-gray-900 tracking-tight">EHR Copilot</span>
        </Link>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] sm:text-[12px]">
          <Link href="/dashboard" className="hidden font-medium text-gray-400 transition-colors hover:text-gray-700 sm:inline">Clinical Dashboard</Link>
          <svg className="hidden h-3.5 w-3.5 text-gray-300 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-green-600">New Session</span>
        </div>
      </div>
    </header>
  );
}

// ─── Tag Input ────────────────────────────────────────────────────────────────
function TagInput({
  label, tags, onAdd, onRemove, placeholder,
}: {
  label: string;
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
  placeholder: string;
}) {
  const [val, setVal] = useState('');
  return (
    <div className="space-y-1.5">
      <label className="field-label">{label}</label>
      <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-200 rounded-xl min-h-[44px] focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-500/10 transition-all">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1.5 bg-green-50 text-green-700 text-[12px] px-2.5 py-1 rounded-lg border border-green-200">
            {t}
            <button onClick={() => onRemove(t)} className="text-green-500 hover:text-red-500 transition-colors">×</button>
          </span>
        ))}
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ',') && val.trim()) {
              e.preventDefault();
              onAdd(val.trim());
              setVal('');
            }
          }}
          placeholder={tags.length === 0 ? placeholder : '+ Add'}
          className="flex-1 min-w-[80px] outline-none text-[13px] bg-transparent text-gray-700 placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}

// ─── Toggle Pills ─────────────────────────────────────────────────────────────
function TogglePills<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="field-label">{label}</label>
      <div className="flex w-full flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-fit">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-200 cursor-pointer sm:flex-none ${
              value === o.value
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Transcript' },
    { n: 2, label: 'AI Analysis' },
    { n: 3, label: 'Review' },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map(({ n, label }, idx) => {
        const done = current > n;
        const active = current === n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300 ${
                done ? 'bg-green-600 text-white'
                : active ? 'bg-green-600 text-white shadow-[0_0_0_3px_rgba(22,163,74,0.2)]'
                : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}>
                {done ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : n}
              </div>
              <span className={`text-[12px] font-semibold transition-colors ${active ? 'text-green-700' : done ? 'text-green-500' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-12 h-px mx-3 transition-colors ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NewSessionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setInput, setReviewPackage, setProcessingStatus, setSessionId, setError } = useSessionStore();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
  const [lowQualityError, setLowQualityError] = useState<{ message: string; score: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.transcript.trim()) e.transcript = 'Transcript is required';
    if (!form.patientId.trim()) e.patientId = 'Patient ID is required';
    if (!form.sessionNumber || parseInt(form.sessionNumber) < 1)
      e.sessionNumber = 'Enter a valid session number';
    if (!form.age || parseInt(form.age) < 1 || parseInt(form.age) > 120)
      e.age = 'Enter a valid age';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') set('transcript', ev.target.result);
    };
    reader.readAsText(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') set('transcript', ev.target.result);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setLowQualityError(null);

    // ── Check subscription quota natively on the client ──
    try {
      if (user?.uid) {
        const quota = await checkSessionQuota(user.uid);
        if (!quota.allowed) {
          setError(quota.reason);
          setIsSubmitting(false);
          return;
        }
      }
    } catch (err) {
      console.error('Quota check failed:', err);
    }

    setProcessingStatus('processing');

    const sessionInput: SessionInput = {
      session: {
        transcript: form.transcript,
        sessionNumber: parseInt(form.sessionNumber),
        sessionType: form.sessionType,
        durationMinutes: parseInt(form.durationMinutes) || 50,
        modality: form.modality,
      },
      patient: {
        id: form.patientId,
        age: parseInt(form.age),
        gender: 'not_specified',
        knownDiagnoses: form.knownDiagnoses,
        currentMedications: form.currentMedications,
      },
      priorNotes: [],
      clinicianPreferences: {
        noteVerbosity: form.verbosity,
        alwaysIncludeRiskSection: true,
      },
    };

    setInput(sessionInput);

    try {
      // ── Step 1: Fire the job — returns sessionId in <1s ──
      const fireRes = await fetch('/api/session/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionInput,
          clinicianId: user?.uid ?? 'default',
        }),
      });

      const fireBody = await fireRes.json() as { sessionId?: string; error?: string; message?: string };

      if (!fireRes.ok || fireBody.error) {
        if (fireBody.error === 'pii_detected') {
          throw new Error(fireBody.message ?? 'PII detected in transcript.');
        }
        throw new Error(fireBody.message ?? `Server error ${fireRes.status}`);
      }

      const sessionId = fireBody.sessionId!;
      setProcessingSessionId(sessionId);

      // ── Step 2: Poll /api/session/status/[sessionId] until done ──
      // Increased to 10 seconds to reduce terminal spam during debugging
      const POLL_INTERVAL_MS = 10000;
      const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes absolute ceiling
      const pollStart = Date.now();

      const reviewPackage = await new Promise<any>((resolve, reject) => {
        const poll = async () => {
          if (Date.now() - pollStart > MAX_WAIT_MS) {
            reject(new Error('Processing timed out after 10 minutes.'));
            return;
          }

          try {
            const statusRes = await fetch(`/api/session/status/${sessionId}`);
            const statusBody = await statusRes.json() as {
              status: string;
              reviewPackage?: any;
              error?: string;
              currentNode?: string;
            };

            if (statusBody.status === 'complete') {
              let pkg = statusBody.reviewPackage;
              // If Inngest wrote status but Redis dropped the package (large payload),
              // fetch it directly from the /review endpoint as a fallback.
              if (!pkg) {
                try {
                  const reviewRes = await fetch(`/api/session/${sessionId}/review`);
                  if (reviewRes.ok) {
                    const reviewBody = await reviewRes.json();
                    pkg = reviewBody.reviewPackage;
                  }
                } catch (_) {
                  // will resolve null and let the review page Firebase fallback handle it
                }
              }
              resolve(pkg);
              return;
            }

            if (statusBody.status === 'error') {
              // Check for low quality transcript error specifically
              if (statusBody.error?.startsWith('LOW_QUALITY_TRANSCRIPT')) {
                reject(Object.assign(new Error('low_quality_transcript'), {
                  isLowQuality: true,
                  rawError: statusBody.error,
                }));
              } else {
                reject(new Error(statusBody.error ?? 'Processing failed.'));
              }
              return;
            }

            // Still processing — wait and try again
            setTimeout(poll, POLL_INTERVAL_MS);
          } catch (pollErr) {
            reject(pollErr);
          }
        };

        setTimeout(poll, POLL_INTERVAL_MS);
      });

      setReviewPackage(reviewPackage);
      setSessionId(sessionId);

      // ── Client-side Firestore save ──
      try {
        if (user?.uid) {
          await saveSession({
            sessionId,
            clinicianId: user.uid,
            patientId: sessionInput.patient.id,
            patientAge: sessionInput.patient.age,
            patientGender: sessionInput.patient.gender,
            knownDiagnoses: sessionInput.patient.knownDiagnoses,
            currentMedications: sessionInput.patient.currentMedications,
            sessionType: sessionInput.session.sessionType,
            sessionNumber: sessionInput.session.sessionNumber,
            modality: sessionInput.session.modality,
            durationMinutes: sessionInput.session.durationMinutes,
            status: 'complete',
            overallRiskLevel: reviewPackage?.overallRiskLevel || 'unknown',
            reviewPackage,
            sessionInput,
            createdAt: new Date(),
          });
          await syncMonthlySessionUsageForUser(user.uid);
        }
      } catch (saveErr) {
        console.error('Failed to save session to Firestore:', saveErr);
      }

      router.push(`/session/${sessionId}/review`);
    } catch (err: any) {
      if (err?.isLowQuality) {
        const rawMsg: string = err.rawError ?? '';
        setLowQualityError({
          message: rawMsg.replace('LOW_QUALITY_TRANSCRIPT: ', '') || 'Transcript quality too low to process.',
          score: 0,
        });
        setProcessingStatus('idle');
      } else {
        const msg = err instanceof Error ? err.message : 'Processing failed';
        setError(msg);
      }
      setIsSubmitting(false);
      setProcessingSessionId(null);
    }
  };

  const wordCount = form.transcript.trim().split(/\s+/).filter(Boolean).length;
  const qualityColor = wordCount < 50 ? '#ef4444' : wordCount < 200 ? '#f59e0b' : '#16A34A';
  const qualityPct = Math.min((wordCount / 500) * 100, 100);

  // Processing overlay
  if (processingSessionId && isSubmitting) {
    return <AgentProgress sessionId={processingSessionId} live={false} />;
  }

  return (
    <main className="min-h-screen bg-gray-50/60 text-gray-900">
      <Navbar />

      {/* ── Form Body — Bento Grid ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1440px] px-4 pt-20 pb-44 sm:px-6 sm:pb-32">
        <div className="grid grid-cols-1 gap-5 items-stretch lg:grid-cols-5">

          {/* ══ LEFT: Transcript ─────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">

              {/* Dark header */}
              <div className="flex flex-col gap-3 bg-gray-900 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <h2 className="text-[14px] font-bold text-white flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Session Transcript
                </h2>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-[11px] font-bold px-3 py-1 rounded-full"
                    style={{ color: qualityColor, background: `${qualityColor}20`, border: `1px solid ${qualityColor}40` }}>
                    {wordCount} Words
                  </div>
                  <div className="flex gap-1.5">
                    {['bg-red-400', 'bg-yellow-400', 'bg-green-400'].map((c) => (
                      <div key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Upload zone with green ambient glow */}
              <div className="flex-shrink-0" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 60%)' }}>
                <div className="px-4 pt-5 pb-2 sm:px-7 sm:pt-6">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl h-36 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                      isDragging ? 'border-green-400 bg-green-50' : 'border-green-200/60 bg-white/60 hover:bg-green-50/60 hover:border-green-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-all ${isDragging ? 'bg-green-100 text-green-600' : 'bg-green-50 border border-green-100 text-green-500'}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-[13px] font-semibold text-gray-700 mb-0.5">Upload Clinical Transcript</p>
                    <p className="text-[11px] text-gray-400">Drag & drop or click to browse (.txt, .pdf)</p>
                    <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileSelect} />
                  </div>
                </div>

                {/* Divider */}
                <div className="relative my-4 px-4 sm:px-7">
                  <div className="absolute inset-x-4 top-1/2 border-t border-gray-100 sm:inset-x-7" />
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-white text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or paste manually</span>
                  </div>
                </div>
              </div>

              {/* Textarea + quality in white zone */}
              <div className="flex min-h-0 flex-1 flex-col px-4 pb-5 sm:px-7 sm:pb-6">
                <textarea
                  id="transcript"
                  value={form.transcript}
                  onChange={(e) => set('transcript', e.target.value)}
                  placeholder="Insert session transcript text here for processing..."
                  className={`flex-1 w-full bg-white border rounded-xl px-5 py-4 text-[14px] text-gray-700 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all duration-200 min-h-[160px] ${
                    errors.transcript ? 'border-red-300' : 'border-gray-200 focus:border-green-400'
                  }`}
                />
                {errors.transcript && (
                  <p className="text-red-500 text-[12px] mt-2 font-medium flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.transcript}
                  </p>
                )}

                {/* Low quality error */}
                {lowQualityError && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-[13px] font-bold text-red-700 mb-1">Incomplete Transcript ({Math.round(lowQualityError.score * 100)}%)</p>
                    <p className="text-[12px] text-red-600/70">{lowQualityError.message}</p>
                    <div className="mt-2 h-1.5 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.round(lowQualityError.score * 100)}%` }} />
                    </div>
                  </div>
                )}

                {/* Quality bar */}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${qualityPct}%`, backgroundColor: qualityColor }} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest sm:text-[11px] sm:whitespace-nowrap">
                    {wordCount === 0 ? 'Start typing…' : wordCount >= 200 ? '✓ Quality OK' : `${wordCount} / 500 words`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ RIGHT: Bento Stack ────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:col-span-2">

            {/* ── BENTO CARD 1: Session Config ─────────────────────────── */}
            <div className="flex-none bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              {/* Green gradient header */}
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)' }}>
                <div className="w-7 h-7 bg-white/60 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-[14px] font-bold text-green-900">Session Config</h2>
              </div>

              <div className="p-5 space-y-4">
                {/* Visual Session Type Tile Picker */}
                <div>
                  <label className="field-label">Session Type</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {([
                      { value: 'intake', label: 'Intake', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'blue' },
                      { value: 'follow_up', label: 'Follow-up', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green' },
                      { value: 'crisis', label: 'Crisis', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'red' },
                    ] as { value: SessionType; label: string; icon: string; color: string }[]).map(({ value, label, icon, color }) => {
                      const active = form.sessionType === value;
                      const palette: Record<string, { border: string; bg: string; icon: string; text: string }> = {
                        blue: { border: active ? 'border-blue-400' : 'border-gray-200', bg: active ? 'bg-blue-50' : 'bg-gray-50 hover:bg-blue-50/40', icon: active ? 'text-blue-600' : 'text-gray-400', text: active ? 'text-blue-700' : 'text-gray-500' },
                        green: { border: active ? 'border-green-400' : 'border-gray-200', bg: active ? 'bg-green-50' : 'bg-gray-50 hover:bg-green-50/40', icon: active ? 'text-green-600' : 'text-gray-400', text: active ? 'text-green-700' : 'text-gray-500' },
                        red: { border: active ? 'border-red-400' : 'border-gray-200', bg: active ? 'bg-red-50' : 'bg-gray-50 hover:bg-red-50/40', icon: active ? 'text-red-500' : 'text-gray-400', text: active ? 'text-red-600' : 'text-gray-500' },
                      };
                      const p = palette[color];
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => set('sessionType', value)}
                          className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all duration-200 cursor-pointer ${p.border} ${p.bg}`}
                        >
                          <svg className={`w-5 h-5 ${p.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                          </svg>
                          <span className={`text-center text-[10px] font-bold sm:text-[11px] ${p.text}`}>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Session # and Duration inline */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="field-label">Session #</label>
                    <input
                      type="number" min={1}
                      value={form.sessionNumber}
                      onChange={(e) => set('sessionNumber', e.target.value)}
                      className={`field-input ${errors.sessionNumber ? 'border-red-300' : ''}`}
                    />
                    {errors.sessionNumber && <p className="text-red-500 text-[10px] mt-1">{errors.sessionNumber}</p>}
                  </div>
                  <div className="min-w-0">
                    <label className="field-label">Duration (min)</label>
                    <input type="number" min={5} max={180}
                      value={form.durationMinutes}
                      onChange={(e) => set('durationMinutes', e.target.value)}
                      className="field-input"
                    />
                  </div>
                </div>

                {/* Modality toggle */}
                <TogglePills
                  label="Modality"
                  value={form.modality}
                  onChange={(v) => set('modality', v)}
                  options={[
                    { value: 'in_person', label: 'In Person' },
                    { value: 'telehealth', label: 'Telehealth' },
                  ]}
                />
              </div>
            </div>

            {/* ── BENTO CARD 2: Clinical Context ───────────────────────── */}
            <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm">
              {/* Blue header */}
              <div className="px-6 py-4 flex items-center gap-3 bg-blue-50 border-b border-blue-100">
                <div className="w-7 h-7 bg-white/60 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-[14px] font-bold text-blue-900">Clinical Context</h2>
              </div>

              <div className="p-5">
                <div className="space-y-4">
                  {/* Patient ID + Age inline */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="field-label">Patient ID</label>
                      <input type="text" value={form.patientId}
                        onChange={(e) => set('patientId', e.target.value)}
                        placeholder="P-XXXX"
                        className={`field-input ${errors.patientId ? 'border-red-300' : ''}`}
                      />
                      {errors.patientId && <p className="text-red-500 text-[10px] mt-1">{errors.patientId}</p>}
                    </div>
                    <div>
                      <label className="field-label">Age</label>
                      <input type="number" min={1} max={120} value={form.age}
                        onChange={(e) => set('age', e.target.value)}
                        className={`field-input ${errors.age ? 'border-red-300' : ''}`}
                      />
                      {errors.age && <p className="text-red-500 text-[10px] mt-1">{errors.age}</p>}
                    </div>
                  </div>

                  <TagInput
                    label="Known Diagnoses"
                    tags={form.knownDiagnoses}
                    onAdd={(t) => set('knownDiagnoses', [...form.knownDiagnoses, t])}
                    onRemove={(t) => set('knownDiagnoses', form.knownDiagnoses.filter((d) => d !== t))}
                    placeholder="ICD-10 code — press Enter"
                  />

                  <TagInput
                    label="Current Medications"
                    tags={form.currentMedications}
                    onAdd={(t) => set('currentMedications', [...form.currentMedications, t])}
                    onRemove={(t) => set('currentMedications', form.currentMedications.filter((m) => m !== t))}
                    placeholder="Medication — press Enter"
                  />

                  <TogglePills
                    label="Note Verbosity"
                    value={form.verbosity}
                    onChange={(v) => set('verbosity', v)}
                    options={[
                      { value: 'concise', label: 'Concise' },
                      { value: 'standard', label: 'Standard' },
                      { value: 'detailed', label: 'Detailed' },
                    ]}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Floating Action Bar ────────────────────────────────────────────── */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
        <div
          className="flex w-full max-w-[860px] flex-col gap-3 rounded-2xl border border-white/60 px-4 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.12)] sm:h-[60px] sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-6 sm:py-0"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {/* Left — discard */}
          <button
            type="button"
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-[12px] font-medium text-gray-400 transition-colors duration-200 hover:text-gray-700 cursor-pointer sm:text-[13px]"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="truncate">Discard & Go Back</span>
          </button>

          {/* Center — readiness chips */}
          <div className="hidden md:flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all duration-300 ${
              wordCount >= 50
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${wordCount >= 50 ? 'bg-green-500' : 'bg-gray-300'}`} />
              {wordCount >= 50 ? 'Transcript Ready' : `${wordCount}/50 words`}
            </div>
            {form.patientId && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border bg-green-50 border-green-200 text-green-700">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Patient ID Set
              </div>
            )}
          </div>

          {/* Right — CTA */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`relative group flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full px-6 py-3 text-[13px] font-bold transition-all duration-300 cursor-pointer sm:w-auto sm:px-7 sm:py-2.5 ${
              isSubmitting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-green-700 hover:shadow-[0_4px_16px_rgba(22,163,74,0.40)] active:scale-[0.97]'
            }`}
          >
            {!isSubmitting && (
              <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            )}
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <span className="relative z-10">Generate Documentation</span>
                <svg className="w-4 h-4 relative z-10 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

    </main>
  );
}
