'use client';

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/session/process',
    summary: 'Process a therapy session transcript',
    description:
      'Runs the full EHR Copilot agent pipeline — transcript quality check → SOAP note generation → risk analysis → DSM-5 diagnostic suggestions → treatment plan — and returns a ReviewPackage for clinician review.',
    requestFields: [
      { name: 'session.transcript', type: 'string', required: true, desc: 'Full session transcript text' },
      { name: 'session.sessionNumber', type: 'integer', required: true, desc: 'Session number (≥1)' },
      { name: 'session.sessionType', type: 'enum', required: true, desc: 'intake | follow_up | crisis' },
      { name: 'session.modality', type: 'enum', required: false, desc: 'in_person | telehealth' },
      { name: 'patient.id', type: 'string', required: true, desc: 'Anonymized patient ID — no real PII' },
      { name: 'patient.age', type: 'integer', required: true, desc: '1–120' },
      { name: 'patient.knownDiagnoses', type: 'string[]', required: false, desc: 'ICD-10/DSM-5 codes' },
      { name: 'clinicianPreferences.noteVerbosity', type: 'enum', required: false, desc: 'concise | standard | detailed' },
    ],
    responseFields: [
      { name: 'sessionId', type: 'string', desc: 'Unique session ID' },
      { name: 'overallRiskLevel', type: 'enum', desc: 'none | low | moderate | high | critical' },
      { name: 'riskFlags[]', type: 'RiskFlag[]', desc: 'Detected clinical risk signals' },
      { name: 'soapNote', type: 'SOAPNote', desc: 'Subjective, Objective, Assessment, Plan sections' },
      { name: 'diagnosisSuggestions[]', type: 'DiagnosisSuggestion[]', desc: 'DSM-5 matches with confidence' },
      { name: 'treatmentPlan', type: 'TreatmentPlan', desc: 'Goals and interventions' },
      { name: 'auditLog[]', type: 'AuditEntry[]', desc: 'Agent action trail' },
    ],
    responseCodes: [
      { code: '200', desc: 'Success — ReviewPackage returned' },
      { code: '400', desc: 'Validation error' },
      { code: '422', desc: 'Transcript quality too low — includes qualityScore' },
      { code: '429', desc: 'Rate limit exceeded (10 req/min per IP)' },
      { code: '500', desc: 'Internal error' },
    ],
    curlExample: `curl -X POST http://localhost:3000/api/session/process \\
  -H "Content-Type: application/json" \\
  -d '{
    "session": {
      "transcript": "Clinician: How have you been?...",
      "sessionNumber": 7,
      "sessionType": "follow_up",
      "modality": "telehealth"
    },
    "patient": { "id": "anon_abc", "age": 34 }
  }'`,
    jsExample: `const res = await fetch('/api/session/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session, patient }),
});
const reviewPackage = await res.json();
const sessionId = res.headers.get('X-Session-Id');`,
  },
  {
    method: 'POST',
    path: '/api/session/revise',
    summary: 'Revise a SOAP section with AI feedback (SSE streaming)',
    description:
      'Accepts clinician feedback and streams a revised version of the specified section using Server-Sent Events. Each event is a JSON token fragment. The final event contains the complete revised text with confidence and provenance.',
    requestFields: [
      { name: 'section', type: 'enum', required: true, desc: 'subjective | objective | assessment | plan' },
      { name: 'currentDraft', type: 'string', required: true, desc: 'Current section text' },
      { name: 'feedback', type: 'string', required: true, desc: 'Clinician revision instruction (max 500 chars)' },
      { name: 'approvedSections', type: 'object', required: true, desc: 'Map of already-approved section content for context' },
      { name: 'transcript', type: 'string', required: true, desc: 'Original session transcript' },
    ],
    responseFields: [
      { name: 'token', type: 'string', desc: 'Streaming token (each SSE event)' },
      { name: 'done', type: 'boolean', desc: 'True on final event' },
      { name: 'content', type: 'string', desc: 'Complete revised text (final event only)' },
      { name: 'confidence', type: 'number', desc: 'AI confidence 0–1 (final event only)' },
      { name: 'provenanceTag', type: 'string', desc: '"ai_revised" (final event only)' },
    ],
    responseCodes: [
      { code: '200', desc: 'Returns text/event-stream — consume with ReadableStream' },
      { code: '400', desc: 'Validation error' },
      { code: '500', desc: 'Stream failed' },
    ],
    curlExample: `curl -X POST http://localhost:3000/api/session/revise \\
  -H "Content-Type: application/json" \\
  --no-buffer \\
  -d '{
    "section": "subjective",
    "currentDraft": "Patient presents with...",
    "feedback": "Add more detail about sleep patterns",
    "approvedSections": {},
    "transcript": "Clinician: ..."
  }'`,
    jsExample: `const res = await fetch('/api/session/revise', {
  method: 'POST',
  body: JSON.stringify({ section, currentDraft, feedback, approvedSections, transcript }),
});
const reader = res.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = new TextDecoder().decode(value);
  // Parse SSE lines: 'data: {...}'
}`,
  },
  {
    method: 'POST',
    path: '/api/session/finalize',
    summary: 'Finalize session and export as FHIR R4 Bundle',
    description:
      'Validates that all SOAP sections are clinician-approved, then constructs a FHIR R4 Bundle containing a DocumentReference, section Observations, DSM-5 Conditions, and risk flag Observations. Returns application/fhir+json.',
    requestFields: [
      { name: 'reviewPackage', type: 'ReviewPackage', required: true, desc: 'The complete reviewed package from Zustand' },
      { name: 'approvedSections', type: 'Record<string, boolean>', required: true, desc: 'Map of section → approved status' },
      { name: 'patientId', type: 'string', required: false, desc: 'Anonymized patient ID (defaults to "anonymous")' },
      { name: 'sessionId', type: 'string', required: false, desc: 'Session identifier' },
    ],
    responseFields: [
      { name: 'resourceType', type: 'string', desc: '"Bundle"' },
      { name: 'type', type: 'string', desc: '"document"' },
      { name: 'entry[]', type: 'object[]', desc: 'DocumentReference + Observations + Conditions' },
      { name: 'meta.tag[]', type: 'Coding[]', desc: 'ai-assisted + clinician-reviewed tags' },
    ],
    responseCodes: [
      { code: '200', desc: 'FHIR R4 Bundle returned (Content-Type: application/fhir+json)' },
      { code: '400', desc: 'Validation error' },
      { code: '422', desc: 'Not all sections approved — missing[] returned' },
      { code: '500', desc: 'Build failed' },
    ],
    curlExample: `curl -X POST http://localhost:3000/api/session/finalize \\
  -H "Content-Type: application/json" \\
  -d '{
    "reviewPackage": { ... },
    "approvedSections": {
      "subjective": true, "objective": true,
      "assessment": true, "plan": true
    },
    "patientId": "anon_abc"
  }'`,
    jsExample: `const res = await fetch('/api/session/finalize', {
  method: 'POST',
  body: JSON.stringify({ reviewPackage, approvedSections, patientId }),
});
const fhirBundle = await res.json();
// Save as .json file with Content-Type: application/fhir+json`,
  },
];

const METHOD_COLORS: Record<string, string> = {
  POST: 'bg-[#6c63ff] text-white',
  GET: 'bg-[#10B981] text-white',
};

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-[#1A1A1A] text-[#E2E8F0] text-[12px] font-mono rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap">
      {code}
    </pre>
  );
}

export default function APIDocsPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-white border-b border-[#E0DDD6] px-8 py-6">
        <div className="max-w-[860px] mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-[#6c63ff] uppercase tracking-widest">API Reference</span>
            </div>
            <h1 className="text-[28px] font-extrabold text-[#1A1A1A] tracking-tight">EHR Copilot API</h1>
            <p className="text-[14px] text-[#6B7280] mt-1">v1.0.0 · OpenAPI 3.0.3 · Base URL: <code className="text-[#1A1A1A] bg-[#F3F4F6] px-1.5 py-0.5 rounded text-[12px]">http://localhost:3000</code></p>
          </div>
          <a
            href="/openapi.json"
            download
            className="text-[13px] font-semibold bg-[#1A1A1A] text-white px-5 py-2.5 rounded-full hover:bg-black transition-colors"
          >
            Download openapi.json
          </a>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-8 py-12 space-y-16">
        {ENDPOINTS.map((ep) => (
          <div key={ep.path}>
            {/* Endpoint header */}
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-[12px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${METHOD_COLORS[ep.method]}`}>
                {ep.method}
              </span>
              <code className="text-[18px] font-bold text-[#1A1A1A] font-mono">{ep.path}</code>
            </div>
            <p className="text-[14px] font-semibold text-[#1A1A1A] mb-1">{ep.summary}</p>
            <p className="text-[14px] text-[#6B7280] leading-relaxed mb-6">{ep.description}</p>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Request */}
              <div>
                <h3 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">Request Body</h3>
                <div className="border border-[#E0DDD6] rounded-xl overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-[#F8F8F6] border-b border-[#E0DDD6]">
                        <th className="text-left px-3 py-2 text-[#6B7280] font-semibold">Field</th>
                        <th className="text-left px-3 py-2 text-[#6B7280] font-semibold">Type</th>
                        <th className="text-left px-3 py-2 text-[#6B7280] font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.requestFields.map((f, i) => (
                        <tr key={f.name} className={i < ep.requestFields.length - 1 ? 'border-b border-[#F0EDE8]' : ''}>
                          <td className="px-3 py-2">
                            <code className="text-[#6c63ff] font-mono">{f.name}</code>
                            {f.required && <span className="ml-1 text-[#EF4444] font-bold">*</span>}
                          </td>
                          <td className="px-3 py-2 text-[#9CA3AF] font-mono">{f.type}</td>
                          <td className="px-3 py-2 text-[#4A4A4A] leading-relaxed">{f.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Response */}
              <div>
                <h3 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">Response Fields</h3>
                <div className="border border-[#E0DDD6] rounded-xl overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-[#F8F8F6] border-b border-[#E0DDD6]">
                        <th className="text-left px-3 py-2 text-[#6B7280] font-semibold">Field</th>
                        <th className="text-left px-3 py-2 text-[#6B7280] font-semibold">Type</th>
                        <th className="text-left px-3 py-2 text-[#6B7280] font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.responseFields.map((f, i) => (
                        <tr key={f.name} className={i < ep.responseFields.length - 1 ? 'border-b border-[#F0EDE8]' : ''}>
                          <td className="px-3 py-2"><code className="text-[#10B981] font-mono">{f.name}</code></td>
                          <td className="px-3 py-2 text-[#9CA3AF] font-mono">{f.type}</td>
                          <td className="px-3 py-2 text-[#4A4A4A]">{f.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Response codes */}
                <div className="mt-3 space-y-1">
                  {ep.responseCodes.map((r) => (
                    <div key={r.code} className="flex items-center gap-2 text-[12px]">
                      <span className={`w-9 text-center font-bold rounded px-1 py-0.5 ${Number(r.code) < 300 ? 'bg-[#D1FAE5] text-[#059669]' : Number(r.code) < 500 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {r.code}
                      </span>
                      <span className="text-[#6B7280]">{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Code examples */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">cURL</p>
                <CodeBlock code={ep.curlExample} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">JavaScript (fetch)</p>
                <CodeBlock code={ep.jsExample} />
              </div>
            </div>

            <div className="border-b border-[#E0DDD6] mt-12" />
          </div>
        ))}

        <p className="text-[12px] text-[#9CA3AF] text-center pb-4">
          EHR Copilot API v1.0.0 · MIT License · AI-assisted clinical documentation
        </p>
      </div>
    </main>
  );
}
