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
    <div>
      <label className="block text-[12px] font-medium text-[#6b7280] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 p-2.5 border border-[#d1d5db] rounded-lg min-h-[40px]">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 bg-[#ede9ff] text-[#6c63ff] text-[12px] px-2.5 py-0.5 rounded-full">
            {t}
            <button onClick={() => onRemove(t)} className="text-[#9ca3af] hover:text-[#ef4444]">×</button>
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
          className="flex-1 min-w-[80px] outline-none text-[13px] bg-transparent placeholder:text-[#9ca3af]"
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
    <div>
      <label className="block text-[12px] font-medium text-[#6b7280] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
              value === o.value
                ? 'bg-[#0f0f0f] text-white'
                : 'border border-[#d1d5db] text-[#6b7280] hover:border-[#0f0f0f]'
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
  const qualityColor = wordCount < 50 ? '#ef4444' : wordCount < 200 ? '#f59e0b' : '#10b981';
  const qualityPct = Math.min((wordCount / 500) * 100, 100);

  // Show agent progress overlay while processing
  if (processingSessionId && isSubmitting) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center">
        <div className="w-full max-w-[500px] px-6">
          <AgentProgress sessionId={processingSessionId} live={false} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Nav activePage="For Clinicians" />

      {/* Page Header */}
      <div className="pt-24 pb-6 px-12 max-w-[1200px] mx-auto">
        <p className="text-[13px] text-[#9ca3af] mb-2">Dashboard / New Session</p>
        <h1 className="text-[40px] font-bold text-[#0f0f0f] tracking-tight">New session</h1>
        <p className="text-[16px] text-[#6b7280] mt-1">
          Upload your session transcript and patient context to generate a clinical note.
        </p>
      </div>

      {/* Form Body */}
      <div className="px-12 pb-32 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-5 gap-6">

          {/* ── LEFT: Transcript ──────────────────────────────────────────── */}
          <div className="col-span-3">
            <div className="bg-white border border-[#e0ddd6] rounded-xl p-6">
              <h2 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">Session transcript</h2>

              {/* Drag-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl h-44 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragging ? 'border-[#6c63ff] bg-[#f5f3ff]' : 'border-[#d1d5db] hover:border-[#9ca3af]'
                }`}
              >
                <div className="w-10 h-10 rounded-full border-2 border-[#6c63ff] flex items-center justify-center mb-2 text-[#6c63ff]">
                  ↑
                </div>
                <p className="text-[15px] text-[#0f0f0f] font-medium">Drag your transcript file here</p>
                <p className="text-[13px] text-[#9ca3af] mt-1">or click to browse — .txt, .docx, .pdf supported</p>
                <button
                  type="button"
                  className="mt-3 bg-[#6c63ff] text-white text-[13px] px-4 py-1.5 rounded-full hover:bg-[#5a52d5] transition-colors"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Browse files
                </button>
                <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileSelect} />
              </div>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e0ddd6]" />
                </div>
                <div className="relative flex justify-center text-[13px] text-[#9ca3af] bg-white px-3 w-fit mx-auto">
                  or paste directly
                </div>
              </div>

              {/* Textarea */}
              <textarea
                id="transcript"
                value={form.transcript}
                onChange={(e) => set('transcript', e.target.value)}
                placeholder="Paste your session transcript here..."
                rows={9}
                className={`w-full border rounded-lg px-4 py-3 text-[15px] text-[#0f0f0f] placeholder:text-[#9ca3af] resize-none focus:outline-none focus:border-[#6c63ff] transition-colors ${
                  errors.transcript ? 'border-[#ef4444]' : 'border-[#d1d5db]'
                }`}
              />
              {errors.transcript && (
                <p className="text-[#ef4444] text-[12px] mt-1">{errors.transcript}</p>
              )}

              {/* Low quality transcript error */}
              {lowQualityError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4">
                  <div className="flex items-start gap-3 mb-3">
                    <svg className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-[13px] font-bold text-[#DC2626]">
                        Transcript quality too low to process (score: {Math.round(lowQualityError.score * 100)}%)
                      </p>
                      <p className="text-[12px] text-[#B91C1C] mt-1">
                        The transcript may be too short, unclear, or missing speaker labels. Try pasting a cleaner version.
                      </p>
                    </div>
                  </div>
                  {/* Quality score bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-red-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#EF4444] rounded-full transition-all"
                        style={{ width: `${Math.round(lowQualityError.score * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#EF4444]">{Math.round(lowQualityError.score * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Quality indicator */}
              <div className="mt-3">
                <div className="flex justify-between text-[12px] text-[#9ca3af] mb-1">
                  <span>Quality score</span>
                  <span>{wordCount} words</span>
                </div>
                <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${qualityPct}%`, backgroundColor: qualityColor }}
                  />
                </div>
                {wordCount === 0 && (
                  <p className="text-[12px] text-[#9ca3af] mt-1">Quality score will appear after upload</p>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Patient Context ────────────────────────────────────── */}
          <div className="col-span-2 space-y-4">
            {/* Session details card */}
            <div className="bg-white border border-[#e0ddd6] rounded-xl p-6">
              <h2 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">Session details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#6b7280] uppercase tracking-wide mb-1.5">
                    Session number
                  </label>
                  <input
                    type="number"
                    value={form.sessionNumber}
                    onChange={(e) => set('sessionNumber', e.target.value)}
                    min={1}
                    className={`w-full border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#6c63ff] ${errors.sessionNumber ? 'border-[#ef4444]' : 'border-[#d1d5db]'}`}
                  />
                  {errors.sessionNumber && <p className="text-[#ef4444] text-[12px] mt-1">{errors.sessionNumber}</p>}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#6b7280] uppercase tracking-wide mb-1.5">
                    Session type
                  </label>
                  <select
                    value={form.sessionType}
                    onChange={(e) => set('sessionType', e.target.value as SessionType)}
                    className="w-full border border-[#d1d5db] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#6c63ff] bg-white"
                  >
                    <option value="intake">Intake</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="crisis">Crisis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#6b7280] uppercase tracking-wide mb-1.5">
                    Duration
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={form.durationMinutes}
                      onChange={(e) => set('durationMinutes', e.target.value)}
                      min={5}
                      max={180}
                      className="flex-1 border border-[#d1d5db] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#6c63ff]"
                    />
                    <span className="text-[13px] text-[#9ca3af]">minutes</span>
                  </div>
                </div>

                <TogglePills
                  label="Modality"
                  value={form.modality}
                  onChange={(v) => set('modality', v)}
                  options={[
                    { value: 'in_person', label: 'In person' },
                    { value: 'telehealth', label: 'Telehealth' },
                  ]}
                />
              </div>
            </div>

            {/* Patient context card */}
            <div className="bg-white border border-[#e0ddd6] rounded-xl p-6">
              <h2 className="text-[18px] font-semibold text-[#0f0f0f] mb-4">Patient context</h2>

              {/* PII warning */}
              <div className="border-l-4 border-[#f59e0b] bg-[#fffbeb] rounded-r-lg px-4 py-3 mb-4">
                <p className="text-[13px] text-[#92400e]">
                  Anonymized IDs only — do not enter patient names or dates of birth.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#6b7280] uppercase tracking-wide mb-1.5">
                    Patient ID
                  </label>
                  <input
                    type="text"
                    value={form.patientId}
                    onChange={(e) => set('patientId', e.target.value)}
                    placeholder="anon_patient_xyz"
                    className={`w-full border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#6c63ff] ${errors.patientId ? 'border-[#ef4444]' : 'border-[#d1d5db]'}`}
                  />
                  {errors.patientId && <p className="text-[#ef4444] text-[12px] mt-1">{errors.patientId}</p>}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#6b7280] uppercase tracking-wide mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => set('age', e.target.value)}
                    min={1}
                    max={120}
                    className={`w-full border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#6c63ff] ${errors.age ? 'border-[#ef4444]' : 'border-[#d1d5db]'}`}
                  />
                  {errors.age && <p className="text-[#ef4444] text-[12px] mt-1">{errors.age}</p>}
                </div>

                <TagInput
                  label="Known diagnoses"
                  tags={form.knownDiagnoses}
                  onAdd={(t) => set('knownDiagnoses', [...form.knownDiagnoses, t])}
                  onRemove={(t) => set('knownDiagnoses', form.knownDiagnoses.filter((d) => d !== t))}
                  placeholder="F32.1 — press Enter to add"
                />

                <TagInput
                  label="Current medications"
                  tags={form.currentMedications}
                  onAdd={(t) => set('currentMedications', [...form.currentMedications, t])}
                  onRemove={(t) => set('currentMedications', form.currentMedications.filter((m) => m !== t))}
                  placeholder="Sertraline 50mg — press Enter"
                />

                <TogglePills
                  label="Note verbosity"
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

      {/* ── Sticky bottom action bar ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e0ddd6] h-20 flex items-center px-12 z-40">
        <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-[#d1d5db] text-[#0f0f0f] text-[14px] font-medium px-6 py-2.5 rounded-full hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex items-center gap-2 text-white text-[15px] font-medium px-8 py-3 rounded-full transition-colors ${
              isSubmitting
                ? 'bg-[#9ca3af] cursor-not-allowed'
                : 'bg-[#0f0f0f] hover:bg-[#1a1a1a]'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating note...
              </>
            ) : (
              <>✦ Generate clinical note</>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
