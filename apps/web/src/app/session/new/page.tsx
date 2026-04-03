'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSessionStore } from '@/lib/store/sessionStore';
import { AgentProgress } from '@/components/processing/AgentProgress';

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
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto px-8 h-[64px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </span>
          <span className="text-[15px] font-bold text-gray-900">EHR Copilot</span>
        </Link>
        <div className="flex items-center gap-2 text-[12px] text-gray-400">
          <span>Clinical Dashboard</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="flex gap-1.5 p-1 bg-gray-50 border border-gray-200 rounded-xl w-fit">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 cursor-pointer ${
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NewSessionPage() {
  const router = useRouter();
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
    setProcessingStatus('processing');

    const sessionInput = {
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

    setInput(sessionInput as any);
    const tempSessionId = `session-${Date.now()}`;
    setProcessingSessionId(tempSessionId);

    try {
      const res = await fetch('/api/session/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionInput),
      });

      if (res.status === 422) {
        const body = await res.json().catch(() => ({})) as { message?: string; qualityScore?: number };
        setLowQualityError({
          message: body.message ?? 'Transcript quality too low to process.',
          score: body.qualityScore ?? 0,
        });
        setIsSubmitting(false);
        setProcessingSessionId(null);
        setProcessingStatus('idle');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? `Server error ${res.status}`);
      }

      const body = await res.json();
      const reviewPackage = body;
      const sessionId = body.sessionId || res.headers.get('X-Session-Id') || tempSessionId;
      setReviewPackage(reviewPackage);
      setSessionId(sessionId);
      router.push(`/session/${sessionId}/review`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      setError(msg);
      setIsSubmitting(false);
      setProcessingSessionId(null);
    }
  };

  const wordCount = form.transcript.trim().split(/\s+/).filter(Boolean).length;
  const qualityColor = wordCount < 50 ? '#ef4444' : wordCount < 200 ? '#f59e0b' : '#16A34A';
  const qualityPct = Math.min((wordCount / 500) * 100, 100);

  // Processing overlay
  if (processingSessionId && isSubmitting) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="blob w-[600px] h-[600px] bg-green-200 -top-60 -right-40 animate-float" />
          <div className="blob w-[400px] h-[400px] bg-green-100 -bottom-20 -left-20 animate-float" style={{ animationDelay: '-3s' }} />
        </div>
        <div className="w-full max-w-[500px] px-6 relative z-10">
          <AgentProgress sessionId={processingSessionId} live={false} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50/50 text-gray-900">
      <Navbar />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2 text-[11px] font-bold text-green-600 uppercase tracking-widest mb-3">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Session
          </div>
          <h1 className="text-[42px] font-bold text-gray-900 leading-tight tracking-[-0.025em] mb-2">
            Generate <span className="text-green-600">Clinical Documentation</span>
          </h1>
          <p className="text-[16px] text-gray-500 max-w-xl leading-relaxed">
            Transform your session transcript into structured SOAP notes, risk assessments, and treatment plans.
          </p>
        </div>
      </div>

      {/* Form Body */}
      <div className="px-8 py-10 pb-36 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-5 gap-6">

          {/* ── LEFT: Transcript ──────────────────────────────────────────── */}
          <div className="col-span-3 space-y-5">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-card p-7">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-bold text-gray-900 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Session Transcript
                </h2>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                  {wordCount} Words
                </div>
              </div>

              {/* Drag-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
                  isDragging
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 bg-gray-50/50 hover:bg-green-50/40 hover:border-green-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors ${isDragging ? 'bg-green-100 text-green-600' : 'bg-white border border-gray-200 text-gray-400'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold text-gray-700 mb-1">Upload Clinical Transcript</p>
                <p className="text-[12px] text-gray-400">Drag & drop or click to browse (.txt, .pdf)</p>
                <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileSelect} />
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Or paste manually
                  </span>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  id="transcript"
                  value={form.transcript}
                  onChange={(e) => set('transcript', e.target.value)}
                  placeholder="Insert session transcript text here for processing..."
                  rows={11}
                  className={`w-full bg-white border rounded-xl px-5 py-4 text-[14px] text-gray-700 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all duration-200 ${
                    errors.transcript ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-green-400'
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
              </div>

              {/* Low quality error */}
              {lowQualityError && (
                <div className="mt-5 bg-red-50 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-red-700 mb-1">
                        Incomplete Transcript (Score: {Math.round(lowQualityError.score * 100)}%)
                      </p>
                      <p className="text-[12px] text-red-600/70 leading-relaxed">
                        {lowQualityError.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-red-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.round(lowQualityError.score * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-red-500">{Math.round(lowQualityError.score * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Quality indicator */}
              <div className="mt-5 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  <span>Transcript Quality</span>
                  <span className="text-gray-700">{wordCount} Words</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${qualityPct}%`, backgroundColor: qualityColor }}
                  />
                </div>
                {wordCount === 0 && (
                  <p className="text-[11px] text-gray-400 mt-2 italic">Begin typing to evaluate quality...</p>
                )}
                {wordCount > 0 && wordCount < 50 && (
                  <p className="text-[11px] text-red-500 mt-2">Minimum 50 words recommended</p>
                )}
                {wordCount >= 200 && (
                  <p className="text-[11px] text-green-600 mt-2 font-medium">✓ Sufficient transcript length</p>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Session & Patient Context ──────────────────────────── */}
          <div className="col-span-2 space-y-5">

            {/* Session details card */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-card p-6">
              <h2 className="text-[15px] font-bold text-gray-900 mb-5 flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Session Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="field-label">Session Number</label>
                  <input
                    type="number"
                    value={form.sessionNumber}
                    onChange={(e) => set('sessionNumber', e.target.value)}
                    min={1}
                    className={`field-input ${errors.sessionNumber ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10' : ''}`}
                  />
                  {errors.sessionNumber && <p className="text-red-500 text-[11px] mt-1">{errors.sessionNumber}</p>}
                </div>

                <div>
                  <label className="field-label">Session Type</label>
                  <select
                    value={form.sessionType}
                    onChange={(e) => set('sessionType', e.target.value as SessionType)}
                    className="field-input appearance-none cursor-pointer"
                  >
                    <option value="intake">Patient Intake</option>
                    <option value="follow_up">Routine Follow-up</option>
                    <option value="crisis">Crisis Intervention</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Duration (minutes)</label>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => set('durationMinutes', e.target.value)}
                    min={5}
                    max={180}
                    className="field-input"
                  />
                </div>

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

            {/* Patient context card */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-card p-6">
              <h2 className="text-[15px] font-bold text-gray-900 mb-5 flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Clinical Context
              </h2>

              {/* PHI warning */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-5">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Security Protocol</p>
                    <p className="text-[12px] leading-relaxed text-amber-700/80">
                      Do not enter Protected Health Information. Anonymize all patient identifiers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="field-label">Anonymized Patient ID</label>
                  <input
                    type="text"
                    value={form.patientId}
                    onChange={(e) => set('patientId', e.target.value)}
                    placeholder="P-XXXX-XXXX"
                    className={`field-input ${errors.patientId ? 'border-red-300' : ''}`}
                  />
                  {errors.patientId && <p className="text-red-500 text-[11px] mt-1">{errors.patientId}</p>}
                </div>

                <div>
                  <label className="field-label">Estimated Age</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => set('age', e.target.value)}
                    min={1}
                    max={120}
                    className={`field-input ${errors.age ? 'border-red-300' : ''}`}
                  />
                  {errors.age && <p className="text-red-500 text-[11px] mt-1">{errors.age}</p>}
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

      {/* ── Sticky bottom bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 border-t border-gray-100 h-24 flex items-center px-8 z-50 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[13px] font-medium text-gray-400 hover:text-gray-700 transition-colors duration-200 group cursor-pointer"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Discard & Go Back
          </button>

          {/* Right side — session summary + submit */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-[12px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${wordCount >= 50 ? 'bg-green-500' : 'bg-gray-300'}`} />
                {wordCount >= 50 ? 'Transcript ready' : `${wordCount}/50 words`}
              </span>
              {form.patientId && (
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Patient ID set
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`relative group px-10 py-3.5 rounded-2xl font-bold text-[13px] transition-all duration-300 cursor-pointer overflow-hidden flex items-center gap-3 ${
                isSubmitting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-gray-900 text-white hover:bg-green-700 hover:shadow-green active:scale-[0.98]'
              }`}
            >
              {/* Shimmer */}
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
      </div>
    </main>
  );
}
