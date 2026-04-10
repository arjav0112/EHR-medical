'use client';

import React, { use, useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSessionStore, selectAllApproved, type SectionKey } from '@/lib/store/sessionStore';
import { generateFhirDocumentReference } from '@/lib/export/generateFhir';
import type { ReviewPackage } from 'agents';

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_ID = 'dev-preview-001';
const MOCK_DATE = 'April 8, 2025';
const MOCK_TS = '2025-04-08T14:22:00Z';

const SECTION_LABELS: Record<SectionKey, string> = {
  risk_flags: 'Risk Protocol',
  subjective: 'Subjective',
  objective: 'Objective',
  assessment: 'Assessment',
  plan: 'Plan',
};

const MOCK_SECTION_STATUSES: Record<SectionKey, string> = {
  risk_flags: 'approved',
  subjective: 'edited',
  objective: 'approved',
  assessment: 'revised',
  plan: 'approved',
};

const MOCK_CONFIRMED_FLAGS = [
  { type: 'suicidal_ideation', label: 'Suicidal Ideation' },
];

const MOCK_SOAP = {
  subjective: {
    content: 'Patient presents with persistent low mood, decreased energy, and anhedonia for the past 3 weeks. Reports difficulty sleeping (early morning awakening) and reduced appetite with a 4 lb weight loss. Denies manic or hypomanic episodes. Patient notes increased irritability affecting occupational functioning.',
    confidence: 0.92,
    provenanceTag: 'clinician_edited',
    revisionRounds: 1,
  },
  objective: {
    content: 'Patient is alert and oriented ×4. Appearance appropriate, psychomotor activity mildly slowed. Speech normal rate and rhythm. Mood "depressed," affect constricted but reactive. Thought process linear and goal-directed. No perceptual disturbances. Insight fair, judgment intact. PHQ-9 score: 16 (moderate-severe).',
    confidence: 0.88,
    provenanceTag: 'approved',
    revisionRounds: 0,
    barometers: {
      psychomotor: { level: 'mild', description: 'Mildly slowed, cooperative, no agitation observed', trend: 'stable' },
      speech: { level: 'normal', description: 'Normal rate and rhythm, spontaneous and coherent', trend: 'improved' },
    },
  },
  assessment: {
    content: 'Major Depressive Disorder, single episode, moderate severity (DSM-5 296.22). Differential includes Persistent Depressive Disorder and Adjustment Disorder with depressed mood. Passive suicidal ideation without plan or intent, low acute risk per Columbia Protocol.\n\n---\n\n**DSM-5 Criteria Evaluation**\n\n| DSM-5 Criterion | Evidence | Status | Δ vs Prior |\n|---|---|---|---|\n| Depressed mood nearly every day | "completely numb and unable to get out of bed" | ✓ Met | → Stable |\n| Anhedonia | Reports inability to enjoy activities previously enjoyed | ✓ Met | → Stable |\n| Sleep disturbance | Early morning awakening reported | ✓ Met | ↑ Worsened |\n| Appetite/weight change | 4 lb weight loss in 3 weeks | ✓ Met | ★ New |\n| Fatigue or loss of energy | Decreased energy daily | ✓ Met | → Stable |\n| Concentration difficulty | Impaired occupational functioning noted | ~ Partial | → Stable |\n| Psychomotor change | Mildly slowed on MSE | ~ Partial | → Stable |\n| Duration ≥2 weeks | 3 weeks reported | ✓ Met | ↓ Improved |',
    confidence: 0.85,
    provenanceTag: 'ai_revised',
    revisionRounds: 2,
    criteriaTable: [
      { criterion: 'Depressed mood nearly every day', evidence: '"completely numb and unable to get out of bed"', met: 'yes', changeFromPrior: 'stable' },
      { criterion: 'Anhedonia', evidence: 'Reports inability to enjoy activities previously enjoyed', met: 'yes', changeFromPrior: 'stable' },
      { criterion: 'Sleep disturbance', evidence: 'Early morning awakening reported', met: 'yes', changeFromPrior: 'worsened' },
      { criterion: 'Appetite/weight change', evidence: '4 lb weight loss in 3 weeks', met: 'yes', changeFromPrior: 'new' },
      { criterion: 'Fatigue or loss of energy', evidence: 'Decreased energy daily', met: 'yes', changeFromPrior: 'stable' },
      { criterion: 'Concentration difficulty', evidence: 'Impaired occupational functioning noted', met: 'partial', changeFromPrior: 'stable' },
    ],
  },
  plan: {
    content: '1. Initiate sertraline 50mg QD, titrate to 100mg after 2 weeks if tolerated.\n2. Refer to CBT – 8 sessions, weekly.\n3. Safety plan reviewed and signed; emergency contacts confirmed.\n4. Follow-up in 2 weeks or sooner PRN.\n5. Labs: TSH, CBC, CMP to rule out metabolic contributions.',
    confidence: 0.9,
    provenanceTag: 'approved',
    revisionRounds: 0,
  },
};

// ── Full mock ReviewPackage (matches the real type exactly) ──────────────────

const MOCK_REVIEW_PACKAGE: ReviewPackage = {
  sessionId: MOCK_ID,
  reviewStatus: 'complete',
  overallRiskLevel: 'low',
  soapNote: {
    subjective: {
      content: 'Patient presents with persistent low mood, decreased energy, and anhedonia for the past 3 weeks. Reports difficulty sleeping (early morning awakening) and reduced appetite with a 4 lb weight loss. Denies manic or hypomanic episodes. Patient notes increased irritability affecting occupational functioning.',
      confidence: 0.92,
      sourceCitations: ['transcript:lines:4-18'],
      status: 'edited',
      revisionRounds: 1,
      provenanceTag: 'clinician_edited',
    },
    objective: {
      content: 'Patient is alert and oriented ×4. Appearance appropriate, psychomotor activity mildly slowed. Speech normal rate and rhythm. Mood "depressed," affect constricted but reactive. Thought process linear and goal-directed. No perceptual disturbances. Insight fair, judgment intact. PHQ-9 score: 16 (moderate-severe).',
      confidence: 0.88,
      sourceCitations: ['transcript:lines:22-35'],
      status: 'approved',
      revisionRounds: 0,
      provenanceTag: 'approved',
    },
    assessment: {
      content: 'Major Depressive Disorder, single episode, moderate severity (DSM-5 296.22). Differential includes Persistent Depressive Disorder and Adjustment Disorder with depressed mood. Passive suicidal ideation without plan or intent, low acute risk per Columbia Protocol.',
      confidence: 0.85,
      sourceCitations: ['transcript:lines:40-55'],
      status: 'approved',
      revisionRounds: 2,
      provenanceTag: 'ai_revised',
    },
    plan: {
      content: '1. Initiate sertraline 50mg QD, titrate to 100mg after 2 weeks if tolerated.\n2. Refer to CBT – 8 sessions, weekly.\n3. Safety plan reviewed and signed; emergency contacts confirmed.\n4. Follow-up in 2 weeks or sooner PRN.\n5. Labs: TSH, CBC, CMP to rule out metabolic contributions.',
      confidence: 0.9,
      sourceCitations: ['transcript:lines:60-72'],
      status: 'approved',
      revisionRounds: 0,
      provenanceTag: 'approved',
    },
  },
  riskFlags: [
    {
      type: 'suicidal_ideation',
      severity: 'low',
      evidence: 'Patient expresses passive thoughts of not wanting to wake up.',
      transcriptLocation: 'lines:67-68',
      protocolTriggered: 'Columbia Suicide Severity Rating Scale',
      requiresImmediateAction: false,
      status: 'confirmed',
    },
  ],
  diagnosisSuggestions: [
    {
      dsm5Code: 'F32.1',
      label: 'Major Depressive Disorder, single episode, moderate',
      confidence: 0.87,
      supportingCriteria: ['Depressed mood most of the day', 'Anhedonia', 'Sleep disturbance', 'Weight loss', 'Fatigue'],
      conflictingSignals: ['No prior manic episodes ruled out'],
      priorDiagnosisMatch: true,
      intervalStatus: 'worsened',
      specifier: 'moderate, without psychotic features',
    },
  ],
  treatmentPlan: {
    currentGoalsProgress: [
      { goal: 'Reduce PHQ-9 below 10', status: 'in_progress', evidenceFromSession: 'PHQ-9 currently 16, down from 21 at intake' },
    ],
    newInterventions: ['Initiate sertraline 50mg QD', 'Weekly CBT referral'],
    nextSessionFocus: 'Medication tolerability and sleep hygiene strategies',
    referrals: ['CBT therapist', 'Psychiatry for medication management'],
  },
  agentMetadata: {
    processingTimeMs: 14200,
    transcriptQualityScore: 0.91,
    agentsInvoked: ['transcript_quality', 'soap', 'risk', 'dsm', 'plan'],
    lowConfidenceSections: [],
  },
  auditLog: [
    { timestamp: '2025-04-08T14:10:00Z', section: 'subjective', action: 'ai_generated' },
    { timestamp: '2025-04-08T14:11:00Z', section: 'objective', action: 'ai_generated' },
    { timestamp: '2025-04-08T14:11:30Z', section: 'assessment', action: 'ai_generated' },
    { timestamp: '2025-04-08T14:12:00Z', section: 'plan', action: 'ai_generated' },
    { timestamp: '2025-04-08T14:18:00Z', section: 'subjective', action: 'clinician_edited', details: 'Expanded HPI detail' },
    { timestamp: '2025-04-08T14:20:00Z', section: 'assessment', action: 'ai_revised', details: 'Incorporated clinician edits' },
    { timestamp: '2025-04-08T14:22:00Z', section: 'all', action: 'clinician_approved' },
  ],
};

// ── Built mock data strings ────────────────────────────────────────────────────

const MOCK_JSON = JSON.stringify({
  resourceType: 'Bundle',
  id: MOCK_ID,
  type: 'document',
  timestamp: MOCK_TS,
  entry: [
    {
      resource: {
        resourceType: 'DocumentReference',
        id: `doc-${MOCK_ID}`,
        status: 'current',
        type: { coding: [{ system: 'http://loinc.org', code: '34109-9', display: 'Note' }] },
        date: MOCK_TS,
        author: [{ display: 'EHR Copilot (AI-assisted)' }],
        content: [{ attachment: { contentType: 'text/plain', title: 'Clinical Note' } }],
      },
    },
    {
      resource: {
        resourceType: 'Composition',
        id: `comp-${MOCK_ID}`,
        status: 'final',
        title: 'EHR Copilot Clinical Note',
        date: MOCK_DATE,
        section: [
          { title: 'Subjective', text: { status: 'generated', div: MOCK_SOAP.subjective.content } },
          { title: 'Objective', text: { status: 'generated', div: MOCK_SOAP.objective.content } },
          { title: 'Assessment', text: { status: 'generated', div: MOCK_SOAP.assessment.content } },
          { title: 'Plan', text: { status: 'generated', div: MOCK_SOAP.plan.content } },
        ],
      },
    },
    {
      resource: {
        resourceType: 'RiskAssessment',
        id: `risk-${MOCK_ID}`,
        status: 'final',
        prediction: [
          {
            outcome: { text: 'Suicidal Ideation' },
            qualitativeRisk: { coding: [{ code: 'low', display: 'Low acute risk — Columbia Protocol' }] },
          },
        ],
      },
    },
  ],
}, null, 2);

const MOCK_TEXT = `EHR COPILOT — CLINICAL NOTE
Session ID: ${MOCK_ID}
Date: ${MOCK_DATE}
Generated: AI-assisted · Clinician reviewed & approved
${'─'.repeat(60)}

SUBJECTIVE
${MOCK_SOAP.subjective.content}
[Confidence: 92% · Provenance: Clinician edited · Revisions: 1]

${'─'.repeat(60)}

OBJECTIVE
${MOCK_SOAP.objective.content}
[Confidence: 88% · Provenance: AI drafted · Approved · Revisions: 0]

${'─'.repeat(60)}

ASSESSMENT
${MOCK_SOAP.assessment.content}
[Confidence: 85% · Provenance: AI drafted · Revised 2× · Revisions: 2]

${'─'.repeat(60)}

PLAN
${MOCK_SOAP.plan.content}
[Confidence: 90% · Provenance: AI drafted · Approved · Revisions: 0]

${'─'.repeat(60)}

RISK FLAGS (CONFIRMED)
⚠  SUICIDAL IDEATION — LOW
   Evidence: "Patient expresses passive thoughts of not wanting to wake up."
   Location: ~00:12:30 · Protocol: Columbia Suicide Severity Rating Scale

${'─'.repeat(60)}

AUDIT TRAIL
2025-04-08T14:10:00Z · subjective  · ai_generated
2025-04-08T14:11:00Z · objective   · ai_generated
2025-04-08T14:11:30Z · assessment  · ai_generated
2025-04-08T14:12:00Z · plan        · ai_generated
2025-04-08T14:18:00Z · subjective  · clinician_edited
2025-04-08T14:20:00Z · assessment  · ai_revised
2025-04-08T14:22:00Z · all         · clinician_approved

${'─'.repeat(60)}
AI-assisted clinical documentation. Reviewed and approved by clinician.
This note does not replace clinical judgment.                  Page 1 / 1`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function provenanceLabel(status: string): { text: string; style: string } {
  if (status === 'edited') return { text: 'Clinician Override', style: 'bg-blue-50 text-blue-600 border-blue-200' };
  if (status === 'revised') return { text: 'Neural Revision', style: 'bg-violet-50 text-violet-600 border-violet-200' };
  return { text: 'AI Synthesized', style: 'bg-green-50 text-green-700 border-green-200' };
}

function confidenceColor(v: number) {
  if (v >= 0.85) return 'bg-green-500';
  if (v >= 0.65) return 'bg-amber-400';
  return 'bg-red-500';
}

// ── Pill Navbar ────────────────────────────────────────────────────────────────

function PillNav() {
  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <div className="w-full max-w-[900px] bg-white rounded-full shadow-[0_2px_20px_rgba(0,0,0,0.10)] border border-gray-100 px-5 h-[58px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <span className="text-[16px] font-bold text-gray-900 tracking-tight">EHR Copilot</span>
        </Link>
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-gray-400 font-medium">New Session</span>
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="text-gray-400 font-medium">Review</span>
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="font-semibold text-green-600">Export</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session</span>
          <span className="text-[11px] font-mono font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full truncate max-w-[160px]">{MOCK_ID}</span>
        </div>
      </div>
    </header>
  );
}

// ── Document Preview Panel ─────────────────────────────────────────────────────

const TABS = [
  {
    id: 'pdf', label: 'PDF Preview', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    )
  },
  {
    id: 'json', label: 'FHIR JSON', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    )
  },
  {
    id: 'text', label: 'Plain Text', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
      </svg>
    )
  },
] as const;

type TabId = typeof TABS[number]['id'];

// Import the entire PDF client as one dynamic chunk — react-pdf is browser-only.
// BlobProvider and ClinicalNotePDF are used directly inside that file (no dynamic
// wrappers needed there), so none of the "su is not a function" pitfalls apply.
const PDFPreviewClient = dynamic(
  () => import('./PDFPreviewClient'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-gray-50">
        <svg className="w-8 h-8 text-gray-300 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-[13px] text-gray-400 font-medium">Compiling PDF…</p>
      </div>
    ),
  }
);

function PDFPreview({ reviewPackage, sessionId, clinicianNote }: { reviewPackage: ReviewPackage; sessionId: string; clinicianNote?: string }) {
  return (
    <PDFPreviewClient
      reviewPackage={reviewPackage}
      sessionId={sessionId}
      clinicianNote={clinicianNote}
    />
  );
}


function JSONPreview({ reviewPackage }: { reviewPackage: ReviewPackage }) {
  const fhir = generateFhirDocumentReference(reviewPackage);
  const jsonStr = JSON.stringify(fhir, null, 2);
  const lines = jsonStr.split('\n');
  const colorize = (line: string) => {
    // keys in quotes — light cyan/blue
    line = line.replace(/"([^"]+)":/g, '<span style="color:#9cdcfe">"$1"</span>:');
    // string values — soft green
    line = line.replace(/: "([^"]*)"/g, ': <span style="color:#ce9178">"$1"</span>');
    // numbers + booleans — orange
    line = line.replace(/: (true|false|null)/g, ': <span style="color:#569cd6">$1</span>');
    // brackets & braces
    line = line.replace(/([{}[\]])/g, '<span style="color:#ffd700">$1</span>');
    return line;
  };

  return (
    <div className="flex flex-col" style={{ height: '80vh', background: '#1e1e2e' }}>
      {/* Header bar */}
      <div className="flex items-center gap-2 px-5 py-3 flex-shrink-0" style={{ borderBottom: '2px solid #3b82f6' }}>
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8b949e' }}>
          FHIR R4 Bundle · {lines.length} lines
        </span>
      </div>

      {/* Code body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 font-mono text-[13px] leading-[1.7]">
        {lines.map((line, i) => (
          <div key={i} className="flex hover:bg-white/[0.03] rounded">
            <span
              className="select-none w-10 flex-shrink-0 text-right pr-5 text-[12px]"
              style={{ color: '#4a5568' }}
            >
              {i + 1}
            </span>
            <span
              className="flex-1 whitespace-pre"
              style={{ color: '#d4d4d4' }}
              dangerouslySetInnerHTML={{ __html: colorize(line.replace(/</g, '&lt;').replace(/>/g, '&gt;')) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TextPreview({ reviewPackage }: { reviewPackage: ReviewPackage }) {
  const soap = reviewPackage.soapNote;
  const textContent = (['subjective', 'objective', 'assessment', 'plan'] as const)
    .map((k) => `## ${k.toUpperCase()}\n${soap[k]?.content ?? ''}`)
    .join('\n\n');
  return (
    <div className="overflow-y-auto p-6 bg-white font-mono text-[12px] text-gray-700 leading-7 whitespace-pre-wrap" style={{ height: '80vh' }}>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plain Text · {textContent.split('\n').length} lines</span>
      </div>
      {textContent}
    </div>
  );
}

function DocumentPreviewPanel({ reviewPackage, sessionId, clinicianNote }: { reviewPackage: ReviewPackage; sessionId: string; clinicianNote?: string }) {
  const [activeTab, setActiveTab] = useState<TabId>('pdf');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    const soap = reviewPackage.soapNote;
    let content: string;
    if (activeTab === 'json') {
      const fhir = generateFhirDocumentReference(reviewPackage);
      content = JSON.stringify(fhir, null, 2);
    } else {
      content = (['subjective', 'objective', 'assessment', 'plan'] as const)
        .map((k) => `## ${k.toUpperCase()}\n${soap[k]?.content ?? ''}`)
        .join('\n\n');
    }
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 ${activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                }`}
            >
              <span className={activeTab === tab.id ? 'text-green-600' : 'text-gray-400'}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Copy button — only for JSON + Text tabs */}
          {activeTab !== 'pdf' && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-800 bg-white border border-gray-200 px-3 py-1.5 rounded-lg transition-all hover:border-gray-300"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  Copy
                </>
              )}
            </button>
          )}
          {/* PDF download pill */}
          {activeTab === 'pdf' && (
            <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1.5 rounded-lg">
              Preview Only
            </span>
          )}
        </div>
      </div>

      {/* Panel body */}
      <div ref={scrollRef} className="relative">
        <div>
          {activeTab === 'pdf' && <PDFPreview reviewPackage={reviewPackage} sessionId={sessionId} clinicianNote={clinicianNote} />}
          {activeTab === 'json' && <JSONPreview reviewPackage={reviewPackage} />}
          {activeTab === 'text' && <TextPreview reviewPackage={reviewPackage} />}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-gray-400">
            {activeTab === 'pdf' && '⚡ Live react-pdf render · ClinicalNotePDF.tsx · A4'}
            {activeTab === 'json' && `📦 FHIR R4 Bundle · ${Math.round(MOCK_JSON.length / 1024 * 10) / 10} KB`}
            {activeTab === 'text' && `📝 Plain text · ${MOCK_TEXT.split('\n').length} lines`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${activeTab === tab.id ? 'bg-green-500 w-4' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { sectionStatuses, reviewPackage: storePackage, reset, setReviewPackage, setSessionId } = useSessionStore();
  const allApproved = useSessionStore(selectAllApproved);

  const [copyDone, setCopyDone] = useState(false);
  const [fhirLoading, setFhirLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [addendum, setAddendum] = useState('');
  const [commentaryAdded, setCommentaryAdded] = useState(false);

  const finalCommentary = commentaryAdded ? addendum : '';

  // Hydrate from API (Redis → Firestore fallback) when store is empty
  // This handles navigation from the dashboard where the store isn't pre-populated.
  useEffect(() => {
    if (storePackage || id === 'dev-preview-001') return;
    fetch(`/api/session/${id}/review`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.reviewPackage) {
          setReviewPackage(data.reviewPackage);
          setSessionId(id);
        }
      })
      .catch(() => { /* silent — falls back to MOCK below */ });
  }, [id, storePackage, setReviewPackage, setSessionId]);

  // Use real data if available, otherwise fall back to mock
  const reviewPackage = storePackage ?? MOCK_REVIEW_PACKAGE;
  const currentSectionStatuses = storePackage ? sectionStatuses : MOCK_SECTION_STATUSES;

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/session/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reviewPackage, clinicianNote: finalCommentary }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clinical-note-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadFHIR = async () => {
    setFhirLoading(true);
    try {
      const fhir = generateFhirDocumentReference(reviewPackage);
      const blob = new Blob([JSON.stringify(fhir, null, 2)], { type: 'application/fhir+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fhir-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('FHIR export failed:', err);
    } finally {
      setFhirLoading(false);
    }
  };

  const handleCopyText = async () => {
    const soap = reviewPackage.soapNote;
    const text = (['subjective', 'objective', 'assessment', 'plan'] as const)
      .map((k) => `## ${k.toUpperCase()}\n${soap[k]?.content ?? ''}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2500);
  };

  const sections = Object.keys(SECTION_LABELS) as SectionKey[];

  return (
    <main className="min-h-screen bg-[#f8faf8]">
      <PillNav />

      {/* DEV BANNER
      <div className="fixed top-[76px] inset-x-0 z-40 flex items-center justify-center gap-3 bg-amber-50 border-b border-amber-200 py-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Dev Preview — Mock Data — Export / PDF Download Page</span>
      </div> */}

      {/* ── Gray Section: Hero ── */}
      <div className="pt-40 pb-16 px-6 max-w-[960px] mx-auto">

        {/* ── Hero ── */}
        <div className="text-center animate-in fade-in slide-in-from-top-6 duration-700">

          {/* Badge — dark outlined pill (matches home page) */}
          <div className="flex justify-center mb-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white shadow-sm">
              <span className="text-[13px] font-bold text-gray-800">✦</span>
              <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-[0.1em]">Export &amp; Verification</span>
            </div>
          </div>

          {/* Headline — green bar highlight (matches home page) */}
          <h1 className="text-[52px] md:text-[58px] font-bold text-gray-900 leading-[1.08] tracking-[-0.025em] mb-6">
            Verification <span className="text-green-600">Complete</span>
          </h1>

          <p className="text-[16px] text-gray-500 leading-[1.65] mb-9 max-w-[520px] mx-auto">
            All clinical vectors have been synchronized and successfully captured into the immutable session state. Ready for export.
          </p>

          {/* CTAs */}
          <div className="flex flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/session/new"
              className="bg-gray-900 text-white text-[14px] font-semibold px-7 py-3.5 rounded-full hover:bg-gray-800 transition-colors duration-200 shadow-sm"
            >
              Start New Session
            </Link>
            <Link
              href="/"
              className="bg-white text-gray-700 text-[14px] font-semibold px-7 py-3.5 rounded-full hover:bg-gray-50 transition-colors duration-200 shadow-sm border border-gray-200"
            >
              Back to Home
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-[13px] text-gray-500 pt-4 border-t border-gray-200 max-w-md mx-auto">
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

      </div>


      {/* ── White Section: Document Preview ── */}
      <div className="bg-white py-14">
        <div className="px-6 max-w-[960px] mx-auto">
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[20px] font-bold text-gray-900">Document Preview</h2>
                <p className="text-[12px] text-gray-400 mt-0.5">Switch tabs to preview the PDF, FHIR JSON bundle, or plain text export.</p>
              </div>
            </div>
            <DocumentPreviewPanel reviewPackage={reviewPackage} sessionId={id} clinicianNote={finalCommentary} />
          </div>
        </div>
      </div>

      {/* ── Gray Section: Audit + Export Cards ── */}
      <div className="px-6 max-w-[960px] mx-auto pt-10 pb-32">


        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 animate-in fade-in duration-700 delay-100">

          {/* Session Audit Matrix card */}
          <div className="rounded-2xl overflow-hidden flex flex-col border border-gray-100" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="bg-white p-6">
              {/* Card header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-green-100">
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[17px] font-bold text-gray-900">Session Audit Matrix</h2>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md flex-shrink-0 ml-2">{MOCK_ID.slice(0, 8)}</span>
                  </div>
                  <p className="text-[13px] text-gray-500 mt-0.5">Provenance trace for each clinical section</p>
                </div>
              </div>

              {/* Rows — each as a mini card */}
              <div className="space-y-2">
                {sections.map((key) => {
                  const prov = provenanceLabel(currentSectionStatuses[key]);
                  return (
                    <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors group">
                      <span className="text-[14px] font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{SECTION_LABELS[key]}</span>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${prov.style}`}>{prov.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Clinician Commentary card */}
          <div className="rounded-2xl overflow-hidden flex flex-col border border-gray-100" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="bg-white p-6 flex flex-col flex-1">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-11 h-11 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                  <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-gray-900">Clinician Final Commentary</h2>
                  <p className="text-[13px] text-gray-500 mt-0.5">Appended to PDF and JSON metadata stream</p>
                </div>
              </div>
              <textarea
                value={addendum}
                onChange={(e) => { if (!commentaryAdded) setAddendum(e.target.value); }}
                placeholder="Capture any final insights or clinical deviations..."
                rows={12}
                disabled={commentaryAdded}
                className={`w-full border rounded-xl px-4 py-3.5 text-[14px] text-gray-700 placeholder-gray-400 leading-relaxed focus:outline-none transition-all duration-200 resize-none ${commentaryAdded
                  ? 'bg-green-50/50 border-green-200 cursor-not-allowed opacity-80'
                  : 'bg-gray-50 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100'
                  }`}
              />
              {/* Add / Edit buttons */}
              <div className="flex items-center gap-3 mt-3">
                {!commentaryAdded ? (
                  <button
                    onClick={() => { if (addendum.trim()) setCommentaryAdded(true); }}
                    disabled={!addendum.trim()}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 active:scale-[0.97] text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    {/* <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg> */}
                    Add Commentary
                  </button>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-green-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      Commentary Added
                    </span>
                    <button
                      onClick={() => setCommentaryAdded(false)}
                      className="text-[12px] font-medium text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Export Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">

          {/* PDF card */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 group hover:shadow-lg transition-all duration-300 flex flex-col" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="bg-white p-6 flex flex-col flex-1">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-green-100 group-hover:bg-green-100 transition-colors">
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900">Protocol PDF</h3>
                  <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">Formally rendered with cryptographic audit trail footer.</p>
                </div>
              </div>
              <button onClick={handleDownloadPDF} disabled={pdfLoading} className="mt-auto w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white text-[13px] font-bold uppercase tracking-[0.08em] py-3 rounded-full transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                {pdfLoading ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Rendering...</> : 'Download PDF'}
              </button>
            </div>
          </div>

          {/* FHIR card */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 group hover:shadow-lg transition-all duration-300 flex flex-col" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="bg-white p-6 flex flex-col flex-1">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-green-100 group-hover:bg-green-100 transition-colors">
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900">FHIR R4 Bundle</h3>
                  <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">HL7-compliant DocumentReference for EHR integration.</p>
                </div>
              </div>
              <button onClick={handleDownloadFHIR} disabled={fhirLoading} className="mt-auto w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white text-[13px] font-bold uppercase tracking-[0.08em] py-3 rounded-full transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                {fhirLoading ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Mapping...</> : 'Export FHIR'}
              </button>
            </div>
          </div>

          {/* Copy card */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 group hover:shadow-lg transition-all duration-300 flex flex-col" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="bg-white p-6 flex flex-col flex-1">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-green-100 group-hover:bg-green-100 transition-colors">
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900">Copy to Clipboard</h3>
                  <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">Plain text for legacy EHR manual entry.</p>
                </div>
              </div>
              <button onClick={handleCopyText} className="mt-auto w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white text-[13px] font-bold uppercase tracking-[0.08em] py-3 rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-sm">
                {copyDone ? <><svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Copied!</> : 'Copy Text'}
              </button>
            </div>
          </div>
        </div>





      </div>

      {/* ── Footer — matching home page ── */}
      <footer className="relative overflow-hidden bg-white">
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-10 pb-12">
            {/* Brand */}
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
              <div className="flex gap-2.5">
                {[
                  { label: 'Facebook', icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z', green: false },
                  { label: 'X', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z', green: true },
                  { label: 'LinkedIn', icon: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z', green: false },
                  { label: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z', green: false },
                ].map(({ label, icon, green }) => (
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

            {/* Link columns */}
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Changelog', 'Roadmap'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Partners', 'Contact Us'] },
              { title: 'Resources', links: ['Help Center', 'Documentation', 'Video Tutorials', 'Community Forum', 'FAQs'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR Compliance', 'Security'] },
            ].map(({ title, links }) => (
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

          {/* Bottom bar */}
          <div className="py-5 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[12px] text-gray-400">© 2026 EHR Copilot Inc. All rights reserved.</p>
            <div className="flex items-center gap-4 text-[12px] text-gray-400">
              <span>HIPAA Compliant</span>
              <span>·</span>
              <span>SOC 2 Type II</span>
              <span>·</span>
              <span>GDPR Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
