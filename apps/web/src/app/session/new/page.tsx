'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/layout/Nav';
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
    <div className="space-y-2">
      <label className="block text-[11px] font-bold text-navy-400 uppercase tracking-widest">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded-xl min-h-[44px] backdrop-blur-md focus-within:border-neon-500/30 transition-all">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1.5 bg-neon-500/10 text-neon-400 text-[12px] px-2.5 py-1 rounded-lg border border-neon-500/20">
            {t}
            <button onClick={() => onRemove(t)} className="text-neon-400/60 hover:text-red-400 transition-colors">×</button>
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
          className="flex-1 min-w-[80px] outline-none text-[13px] bg-transparent text-white placeholder:text-navy-500"
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
    <div className="space-y-2">
      <label className="block text-[11px] font-bold text-navy-400 uppercase tracking-widest">
        {label}
      </label>
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 ${
              value === o.value
                ? 'bg-neon-500 text-navy-950 shadow-[0_0_15px_rgba(190,242,100,0.4)]'
                : 'text-navy-300 hover:text-white hover:bg-white/5'
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

  // ── Field helpers ──────────────────────────────────────────────────────────
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

  // ── Drag & drop ────────────────────────────────────────────────────────────
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

  // ── Submit ─────────────────────────────────────────────────────────────────
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

      // 422 = low quality transcript
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
  const qualityColor = wordCount < 50 ? '#ef4444' : wordCount < 200 ? '#f59e0b' : '#BEF264';
  const qualityPct = Math.min((wordCount / 500) * 100, 100);

  // Show agent progress overlay while processing
  if (processingSessionId && isSubmitting) {
    return (
      <main className="min-h-screen bg-navy-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-500/20 blur-[120px] rounded-full animate-pulse-glow" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/20 blur-[120px] rounded-full animate-float shadow-[0_0_100px_rgba(6,182,212,0.3)]" />
        </div>
        <div className="w-full max-w-[500px] px-6 relative z-10">
          <AgentProgress sessionId={processingSessionId} live={false} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy-950 text-white selection:bg-neon-500/30">
      <Nav activePage="For Clinicians" />

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 blur-[150px] rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Page Header */}
      <div className="pt-32 pb-12 px-12 max-w-[1200px] mx-auto relative z-10">
        <div className="flex items-center gap-2 text-[13px] font-bold text-neon-500 uppercase tracking-widest mb-4">
          <span className="w-8 h-[1px] bg-neon-500/50" />
          Clinical Dashboard / New Session
        </div>
        <h1 className="text-[56px] font-serif font-medium leading-tight tracking-tight text-white mb-4">
          Generate <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-400 to-cyan-400">Clinical Insight.</span>
        </h1>
        <p className="text-xl text-navy-300 max-w-2xl leading-relaxed">
          Transform raw transcripts into structured medical documentation with AI-driven precision.
        </p>
      </div>

      {/* Form Body */}
      <div className="px-12 pb-48 max-w-[1200px] mx-auto relative z-10">
        <div className="grid grid-cols-5 gap-8">

          {/* ── LEFT: Transcript ──────────────────────────────────────────── */}
          <div className="col-span-3 space-y-6">
            <div className="glass-card p-8 group">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif font-medium text-white flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-neon-500 shadow-[0_0_8px_rgba(190,242,100,0.8)]" />
                  Session Transcript
                </h2>
                <div className="text-[12px] font-bold text-navy-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  {wordCount} Words Detected
                </div>
              </div>

              {/* Drag-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-2xl h-52 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 relative overflow-hidden group/drop ${
                  isDragging 
                    ? 'border-neon-500 bg-neon-500/10 shadow-[0_0_30px_rgba(190,242,100,0.15)]' 
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                }`}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-neon-500/5 to-cyan-500/5 opacity-0 group-hover/drop:opacity-100 transition-opacity" />
                
                <div className="w-12 h-12 rounded-full bg-navy-900 border border-white/10 flex items-center justify-center mb-4 text-neon-500 group-hover/drop:scale-110 group-hover/drop:border-neon-500/50 transition-all duration-300 shadow-xl">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-[16px] text-white font-medium mb-1">Upload Clinical Transcript</p>
                <p className="text-[13px] text-navy-400">Drag files here or (.txt, .pdf supported)</p>
                
                <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileSelect} />
              </div>

              {/* Divider */}
              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[10px] font-bold text-navy-500 bg-navy-950 px-6 w-fit mx-auto uppercase tracking-[0.3em]">
                  Or Paste Transcript Manually
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  id="transcript"
                  value={form.transcript}
                  onChange={(e) => set('transcript', e.target.value)}
                  placeholder="Insert session transcript text here for processing..."
                  rows={12}
                  className={`w-full bg-white/[0.02] border rounded-xl px-6 py-4 text-[15px] text-white placeholder:text-navy-600 resize-none focus:outline-none focus:border-neon-500/50 focus:bg-white/[0.04] transition-all duration-300 ${
                    errors.transcript ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {errors.transcript && (
                  <p className="text-red-400 text-[12px] mt-2 font-medium flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-400" />
                    {errors.transcript}
                  </p>
                )}
              </div>

              {/* Low quality transcript error */}
              {lowQualityError && (
                <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-6 backdrop-blur-xl">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-red-100 mb-1">
                        Incomplete Transcript Analysis (Score: {Math.round(lowQualityError.score * 100)}%)
                      </p>
                      <p className="text-[13px] text-red-200/70 leading-relaxed">
                        The content provided does not meet clinical requirements. Please ensure the transcript is comprehensive and contains clear speaker labels.
                      </p>
                    </div>
                  </div>
                  {/* Quality score bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.round(lowQualityError.score * 100)}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-red-400">{Math.round(lowQualityError.score * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Quality indicator */}
              <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="flex justify-between text-[11px] font-bold text-navy-400 uppercase tracking-widest mb-2">
                  <span>Data Integrity Score</span>
                  <span className="text-white">{wordCount} Words</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(190,242,100,0.3)]"
                    style={{ width: `${qualityPct}%`, backgroundColor: qualityColor }}
                  />
                </div>
                {wordCount === 0 && (
                  <p className="text-[12px] text-navy-500 mt-2 italic">Begin typing to evaluate transcript quality...</p>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Patient Context ────────────────────────────────────── */}
          <div className="col-span-2 space-y-6">
            {/* Session details card */}
            <div className="glass-card p-8">
              <h2 className="text-xl font-serif font-medium text-white mb-6 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                Session Architecture
              </h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-navy-400 uppercase tracking-widest">
                    Sequence Number
                  </label>
                  <input
                    type="number"
                    value={form.sessionNumber}
                    onChange={(e) => set('sessionNumber', e.target.value)}
                    min={1}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-500/30 transition-all ${errors.sessionNumber ? 'border-red-500/30' : 'border-white/10'}`}
                  />
                  {errors.sessionNumber && <p className="text-red-400 text-[11px] mt-1 font-medium">{errors.sessionNumber}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-navy-400 uppercase tracking-widest">
                    Classification
                  </label>
                  <select
                    value={form.sessionType}
                    onChange={(e) => set('sessionType', e.target.value as SessionType)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-500/30 appearance-none transition-all cursor-pointer"
                  >
                    <option value="intake" className="bg-navy-900">Patient Intake</option>
                    <option value="follow_up" className="bg-navy-900">Routine Follow-up</option>
                    <option value="crisis" className="bg-navy-900">Crisis Intervention</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-navy-400 uppercase tracking-widest">
                    Interaction Duration
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={form.durationMinutes}
                      onChange={(e) => set('durationMinutes', e.target.value)}
                      min={5}
                      max={180}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-500/30 transition-all"
                    />
                    <span className="text-[12px] font-bold text-navy-500 uppercase">Min.</span>
                  </div>
                </div>

                <TogglePills
                  label="Modality"
                  value={form.modality}
                  onChange={(v) => set('modality', v)}
                  options={[
                    { value: 'in_person', label: 'Clinical Office' },
                    { value: 'telehealth', label: 'Virtual Care' },
                  ]}
                />
              </div>
            </div>

            {/* Patient context card */}
            <div className="glass-card p-8">
              <h2 className="text-xl font-serif font-medium text-white mb-6 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                Clinical Context
              </h2>

              {/* PII warning */}
              <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/10 p-5 mb-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <p className="text-[12px] leading-relaxed text-indigo-200/50 italic">
                    <strong className="text-indigo-400 uppercase tracking-widest text-[10px] block mb-1">Security Protocol</strong>
                    Anonymize all clinical identifiers. DO NOT enter Protected Health Information (PHI) including patient names, specific addresses, or exact dates.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-navy-400 uppercase tracking-widest">
                    Anonymized Patient ID
                  </label>
                  <input
                    type="text"
                    value={form.patientId}
                    onChange={(e) => set('patientId', e.target.value)}
                    placeholder="P-XXXX-XXXX"
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-500/30 transition-all ${errors.patientId ? 'border-red-500/30' : 'border-white/10'}`}
                  />
                  {errors.patientId && <p className="text-red-400 text-[11px] mt-1 font-medium">{errors.patientId}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-navy-400 uppercase tracking-widest">
                    Estimated Age
                  </label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => set('age', e.target.value)}
                    min={1}
                    max={120}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-500/30 transition-all ${errors.age ? 'border-red-500/30' : 'border-white/10'}`}
                  />
                  {errors.age && <p className="text-red-400 text-[11px] mt-1 font-medium">{errors.age}</p>}
                </div>

                <TagInput
                  label="Associated Diagnoses"
                  tags={form.knownDiagnoses}
                  onAdd={(t) => set('knownDiagnoses', [...form.knownDiagnoses, t])}
                  onRemove={(t) => set('knownDiagnoses', form.knownDiagnoses.filter((d) => d !== t))}
                  placeholder="ICD-10 Code — Enter"
                />

                <TagInput
                  label="Active Pharmacotherapy"
                  tags={form.currentMedications}
                  onAdd={(t) => set('currentMedications', [...form.currentMedications, t])}
                  onRemove={(t) => set('currentMedications', form.currentMedications.filter((m) => m !== t))}
                  placeholder="Clinical Rx — Enter"
                />

                <TogglePills
                  label="LLM Verbosity Tier"
                  value={form.verbosity}
                  onChange={(v) => set('verbosity', v)}
                  options={[
                    { value: 'concise', label: 'Efficient' },
                    { value: 'standard', label: 'Balanced' },
                    { value: 'detailed', label: 'Exhaustive' },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky bottom action bar ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-navy-950/60 border-t border-white/5 h-28 flex items-center px-12 z-50 backdrop-blur-3xl">
        <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-navy-500 text-[11px] font-bold uppercase tracking-[0.2em] hover:text-white transition-all flex items-center gap-3 group"
          >
            <span className="w-8 h-[1px] bg-navy-800 group-hover:bg-white group-hover:w-12 transition-all duration-500" />
            Discard Session
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`relative group px-12 py-5 rounded-2xl font-bold text-[13px] uppercase tracking-[0.2em] transition-all duration-700 overflow-hidden shadow-2xl ${
              isSubmitting
                ? 'bg-navy-900 text-navy-700 cursor-not-allowed border border-white/5'
                : 'bg-neon-500 text-navy-950 hover:shadow-[0_0_50px_rgba(190,242,100,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95'
            }`}
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            
            {isSubmitting ? (
              <div className="flex items-center gap-3 relative z-10">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing Vector Stream...
              </div>
            ) : (
              <div className="flex items-center gap-3 relative z-10">
                Initialize Synthesis
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
