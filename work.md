# EHR Copilot — Work & Learning Notes

> A learning-oriented breakdown of everything built in Batches 1, 2 & 3.
> Goal: understand WHY each piece exists, not just what it does.

---

## 1. Monorepo with pnpm Workspaces

### What it is
A **monorepo** is a single git repository that holds multiple packages — here, the Next.js web app AND the agent system live side by side.

### Why pnpm?
- `pnpm` uses a **content-addressable store** — packages are never duplicated on disk, only symlinked. Much faster and leaner than npm/yarn.
- `pnpm-workspace.yaml` tells pnpm: *"treat `apps/*` and `packages/*` as workspace members"*
- Any package can depend on another via `"agents": "workspace:*"` — pnpm resolves it locally instead of hitting npm.

### Structure
```
soap/
├── apps/web/          ← Next.js 16.2.1 (the UI)
└── packages/agents/   ← Pure TypeScript agent logic (no Next.js dependency)
```
Keeping agents in a separate package means they can theoretically run anywhere (serverless function, CLI, another framework) — not locked to Next.js.

---

## 2. Shared TypeScript Interfaces (`packages/agents/src/types/index.ts`)

Everything in the system is typed from one canonical file. This is the **single source of truth** for all data shapes.

### Key types and why they exist

| Type | Purpose |
|---|---|
| `SessionInput` | The input contract. Everything the agents need: transcript, patient context, prior notes, preferences |
| `SOAPSection` | One SOAP section. Has `confidence`, `sourceCitations`, `status`, `provenanceTag` to track the *lifecycle* of AI-generated content |
| `RiskFlag` | A clinical risk signal. Has `evidence` (verbatim quote) so clinicians can verify the AI didn't hallucinate |
| `DiagnosisSuggestion` | DSM-5 suggestion with `conflictingSignals` to surface disagreements with existing diagnoses |
| `ReviewPackage` | The **output contract** — the assembled bundle the clinician sees |
| `GraphState` | The **LangGraph state** — the mutable object passed between all agent nodes |
| `AuditEntry` | Every AI action is logged — who/what changed what and when |

### Zod = Runtime Validation
TypeScript types are **erased at runtime**. Zod gives us the same shapes as runtime validators:
```ts
// TypeScript type (compile time only)
type SessionInput = { ... }

// Zod schema (validates actual JSON at runtime)
const SessionInputSchema = z.object({ ... })
```
The API route uses `SessionInputSchema.safeParse(body)` to reject malformed requests before they reach any LLM.

---

## 3. LangGraph — The Core Concept

### What is LangGraph?
LangGraph is a library for building **stateful, multi-step AI workflows** as a directed graph.

Think of it as: **each node is a function, edges define what runs next, and a shared state object flows through all of them.**

```
Node A → Node B → Node C
           ↓
        Node D (if condition)
```

### Why not just chain LLM calls sequentially?
Chained calls work for simple cases but break down when you need:
- **Parallel execution** (SOAP note and risk screening at the same time)
- **Conditional routing** (bad transcript → skip everything, go to END)
- **Human-in-the-loop** (pause graph, wait for clinician approval, resume)
- **State persistence** (save progress, resume from a checkpoint)

LangGraph handles all of this.

### The State Object (`GraphState`)
```ts
interface GraphState {
  input: SessionInput           // never mutated
  transcriptQualityScore: number
  soapNote: Partial<SOAPNote>
  riskFlags: RiskFlag[]
  diagnosisSuggestions: DiagnosisSuggestion[]
  treatmentPlan: TreatmentPlan | null
  reviewPackage: ReviewPackage | null
  auditLog: AuditEntry[]        // append-only
  error: string | null
}
```
Every node receives the **full state** and returns only the **fields it changed**. LangGraph merges the partial update back using **reducers**.

### Reducers
```ts
// auditLog uses an append reducer — never loses history
auditLog: Annotation<AuditEntry[]>({
  reducer: (prev, next) => [...prev, ...next],  // append
})

// transcriptQualityScore uses a replace reducer
transcriptQualityScore: Annotation<number>({
  reducer: (_, next) => next,  // overwrite
})
```
This is important: two parallel nodes can both write to the same state. The reducer decides how to merge them.

---

## 4. The Agent Graph (`packages/agents/src/graph.ts`)

### Full flow
```
START
  │
  ▼
transcriptQualityNode
  │
  ├──[score < 0.4]──→ END  (error set on state)
  │
  ├──→ soapNode ─────────┐
  │                       ├──→ dsmNode → planNode → reviewBundlerNode → END
  └──→ riskNode ─────────┘
```

### Parallel execution
`soapNode` and `riskNode` both fan out from `transcriptQualityNode`. LangGraph runs them concurrently and waits for both before moving to `dsmNode`. This halves the latency for that stage.

```ts
.addEdge('transcriptQualityNode', 'soapNode')   // fan-out
.addEdge('transcriptQualityNode', 'riskNode')   // fan-out
.addEdge('soapNode', 'dsmNode')                 // fan-in (waits for both)
.addEdge('riskNode', 'dsmNode')                 // fan-in
```

### Conditional edge
```ts
function routeAfterQuality(state): 'parallel_soap_risk' | typeof END {
  if (state.error || state.transcriptQualityScore < 0.4) return END;
  return 'parallel_soap_risk';
}
.addConditionalEdges('transcriptQualityNode', routeAfterQuality, { ... })
```
This is like an `if` statement at the graph level — the routing function inspects state and returns the next node name.

---

## 5. Individual Agent Nodes

### How each agent is structured
Every agent file exports a single async function that:
1. Takes `state: GraphState`
2. Calls the LLM with structured output
3. Returns `Partial<GraphState>` — only the fields it changed

### Structured Output (`.withStructuredOutput()`)
Instead of getting raw text back from the LLM and trying to parse it, we give the LLM a Zod schema and it returns a **guaranteed-typed object**:

```ts
const model = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })
  .withStructuredOutput(SOAPOutputSchema);  // Zod schema

const result = await model.invoke([...messages]);
// result is typed as z.infer<typeof SOAPOutputSchema>
// No JSON.parse(), no try/catch around parsing
```
Under the hood, this uses Claude's tool-calling / function-calling API to enforce structure.

### Agent-by-agent breakdown

**`transcriptQualityAgent`**
- Scores 4 dimensions: clarity, speaker separation, completeness, clinical relevance
- Averages them into a 0-1 score
- If < 0.4, sets `state.error` and the graph routes to END — downstream agents never run

**`soapAgent`**
- Generates all 4 SOAP sections in one LLM call
- Each section gets `sourceCitations` — forces the LLM to reference transcript line numbers
- Sections with `confidence < 0.75` are flagged in metadata for the clinician
- All sections start with `status: 'draft'` and `provenanceTag: 'ai_drafted'`

**`riskAgent`** (runs in parallel with soapAgent)
- Screens 5 clinical risk categories
- System prompt mandates a **verbatim quote** for every flag — no flag without evidence
- `requiresImmediateAction: true` only for high/critical suicidal ideation
- If any flag triggers immediate action, `planAgent` is automatically blocked

**`dsmAgent`**
- Runs AFTER soapAgent (needs the assessment section)
- Compares suggestions against `patient.knownDiagnoses` — explicitly surfaces conflicts instead of silently overriding
- Returns max 4 suggestions (1 primary + 3 differentials)

**`planAgent`**
- Has access to the full state (soap + risk + diagnoses)
- If `requiresImmediateAction` is true on any flag, returns `treatmentPlan: null` with an audit entry explaining the block
- Evaluates progress on prior goals using `state.input.priorNotes`

**`reviewBundler`**
- Assembles `ReviewPackage` — the final output the frontend consumes
- Sets `overallRiskLevel` based on worst risk flag severity
- Calculates `processingTimeMs` by comparing first and last audit timestamps
- Writes the initial audit log entries in clinician-review priority order: risks first, then S→O→A→P

---

## 6. Revision Agent (Standalone Streaming)

### Why it's outside the main graph
The revision agent is called interactively — the clinician is looking at a section, types feedback, and watches the revised text stream in. That's incompatible with the batch graph execution model.

### Async Generator Pattern
```ts
export async function* reviseSection(input): AsyncGenerator<...> {
  const stream = await model.stream([...messages]);

  for await (const chunk of stream) {
    yield { chunk: text, done: false };   // stream each token to the UI
  }

  yield { done: true, section: { ...finalMetadata } };  // final metadata
}
```
- `async function*` is a JavaScript async generator — it can `yield` multiple values over time
- The caller uses `for await (const event of reviseSection(input))` to consume each chunk
- The final `yield` carries the updated `SOAPSection` metadata (confidence, provenanceTag: `'ai_revised'`, incremented `revisionRounds`)

---

## 7. LLM Choice: Claude claude-sonnet-4-20250514

All agents use `claude-sonnet-4-20250514` via `@langchain/anthropic`:
- **Temperature 0** for factual, deterministic tasks (quality scoring, risk flagging)
- **Temperature 0.1–0.2** for structured clinical output (SOAP, diagnoses)
- **Temperature 0.3** for more generative tasks (treatment planning)
- **Temperature 0.2 + streaming** for revision (needs fluency + interactivity)

---

## 8. Next.js App (`apps/web`)

### App Router (Next.js 13+)
All pages live in `src/app/`. The folder structure IS the routing:
```
src/app/
  page.tsx          → /
  session/page.tsx  → /session
  api/analyze/route.ts  → POST /api/analyze
```

### Server-Sent Events (SSE) — `api/analyze/route.ts`
Instead of waiting for all agents to finish before responding, we stream progress events to the frontend in real-time:
```
POST /api/analyze
↓
data: {"type":"status","step":"soap","message":"Generating..."}
data: {"type":"soap_complete","soap":{...}}
data: {"type":"risk_flags","flags":[...]}
data: {"type":"done"}
```
The client reads these with `ReadableStream` + `TextDecoder` and updates the UI as events arrive.

### Zustand Store (`src/store/ehr-store.ts`)
Global state for the UI — holds the session data, SOAP note, risk flags, etc. Why Zustand over Redux?
- No boilerplate (no actions, reducers, dispatch)
- Works with React hooks directly: `const { soapNote } = useEHRStore()`
- The `devtools` middleware enables browser DevTools inspection of state changes

---

## 9. Design System

Defined in `tailwind.config.ts` — semantic color tokens enforce clinical meaning:

| Token | Hex | Meaning |
|---|---|---|
| `brand.DEFAULT` | `#6c63ff` | AI actions only |
| `risk.critical` | `#991b1b` | Immediate danger |
| `risk.high` | `#ef4444` | High severity |
| `risk.moderate` | `#f97316` | Moderate concern |
| `status.approved` | `#10b981` | Clinician approved |
| `status.revised` | `#6c63ff` | AI re-drafted |

Using semantic tokens (not hardcoded hex values in components) means a color meaning change propagates everywhere automatically.

---

## 10. What's Next (Batches 3–8)

- **Batch 3** — Next.js API routes wiring the LangGraph graph to SSE
- **Batch 4** — Session review UI (SOAP editor, risk panel, diagnosis panel)
- **Batch 5** — Treatment plan UI + revision workflow
- **Batch 6** — PDF export (`@react-pdf/renderer`) + FHIR R4 JSON bundle
- **Batch 7** — History, audit log view, session management
- **Batch 8** — Polish, error boundaries, loading states

---

## 11. Batch 3 — Next.js API Route Handlers

### Route overview

| Route | Method | Purpose |
|---|---|---|
| `/api/session/process` | POST | Run full ehrGraph, return ReviewPackage |
| `/api/session/revise` | POST | Stream revised SOAP section (SSE) |
| `/api/session/finalize` | POST | Validate approvals, output FHIR + audit trail |
| `/api/session/[id]/status` | GET | Poll session processing progress |

### Validation layers
Every route has at least two validation layers:
1. **JSON parse** — catches malformed request bodies early
2. **Zod `.safeParse()`** — validates shape and types, returns structured error details

```ts
const parsed = SessionInputSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: 'validation_error', issues: parsed.error.flatten() }, { status: 400 });
}
```
`.safeParse()` (not `.parse()`) never throws — it returns `{ success, data }` or `{ success, error }`.

### PII Guard (process route)
A basic regex guard rejects transcripts that appear to contain a full name near a date:
```ts
/\b[A-Z][a-z]+ [A-Z][a-z]+\b.{0,60}\b(January|...|\d{1,2}[\/\-]\d{1,2}...)\b/
```
This is a **surface-level guard only** — not a substitute for proper de-identification pipelines in production. It returns HTTP 422 (Unprocessable Entity), not 400, because the request is valid JSON but contains content we refuse to process.

### Why 422 vs 400 vs 500?
- **400 Bad Request** — malformed input, wrong shape, missing fields
- **422 Unprocessable Entity** — valid input format, but the content is rejected (PII detected, low quality transcript)
- **500 Internal Server Error** — unexpected failure during processing

### SSE Streaming (revise route)
The revision route drives the `reviseSection` async generator and forwards each yield as an SSE event:
```
data: {"token": "The patient", "done": false}
data: {"token": " reported", "done": false}
...
data: {"token": "", "done": true, "confidence": 0.85, "provenanceTag": "ai_revised", "revisionRounds": 2}
```
The `X-Accel-Buffering: no` header tells Nginx (if deployed there) not to buffer the response — without it, the browser wouldn't see events until the buffer fills.

### FHIR R4 (finalize route)
FHIR (Fast Healthcare Interoperability Resources) is the international standard for healthcare data exchange. We build a **FHIR R4 Bundle** containing:

| Resource | What it holds |
|---|---|
| `DocumentReference` | The 4 SOAP sections as base64-encoded `Attachment` entries |
| `RiskAssessment` | Risk flags mapped to FHIR `prediction` array |
| `Condition` (×N) | One per diagnosis suggestion with ICD-10 codes |
| `CarePlan` | Treatment interventions as `activity` entries |

```ts
encodeBase64(text) = Buffer.from(text, 'utf-8').toString('base64')
```
FHIR attachments must be base64-encoded by spec.

The finalize route also **enforces the approval gate**:
```ts
const draftSections = sections.filter(s => pkg.soapNote[s].status === 'draft');
if (draftSections.length > 0) → 400 with list of unapproved sections
```
No section can sneak through as `'draft'` — the clinician must explicitly act on every AI output.

### Status store (in-memory Map)
```ts
const sessionStatusStore = new Map<string, { status, currentNode, percentComplete }>();
```
A `Map` is used instead of a database for now — it's scoped to the Node.js process (lost on restart). Production upgrade: **Upstash Redis** (serverless-compatible, works with Next.js edge/serverless functions). The comment `// upgrade to Redis in v2` is a deliberate technical debt marker.

### Middleware (`src/middleware.ts`)
Next.js middleware runs **before** any route handler and can modify/reject requests at the edge:

```ts
export function middleware(req: NextRequest): NextMiddlewareResult { ... }
export const config = { matcher: [...] }  // which routes to apply to
```

**Rate limiter** — in-memory Map per IP, 10 req/min on `/api/session/process`:
```ts
if (record.count >= RATE_LIMIT.maxRequests) → 429 Too Many Requests
```
Response includes standard `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` headers so clients can back off intelligently.

**Security headers applied to every response:**
- `Content-Security-Policy` — restricts what scripts/styles/fonts can load
- `X-Frame-Options: DENY` — prevents the app from being embedded in an `<iframe>` (clickjacking protection)
- `X-Content-Type-Options: nosniff` — prevents browsers from guessing MIME types
- `Strict-Transport-Security` — forces HTTPS after first visit (HSTS)
- `Referrer-Policy` — controls how much URL info is sent in the `Referer` header

---

## 10. Batch 6 — Core Clinical Review Components

These are the most interactive pieces of the UI. Each handles one specific concern in the clinical review workflow.

### `ConfidenceBar` + `ProvenanceTag`
Simple stateless display components. They turn raw numbers and strings from the AI into **human-understandable signals** for the clinician.

- `ConfidenceBar`: A colored progress bar (green ≥ 85%, amber ≥ 65%, red below). The color-coding is a deliberate safety feature — low-confidence AI output is visually flagged so clinicians don't blindly trust it.
- `ProvenanceTag`: Shows the full lifecycle of a section: `AI drafted → Revised 2× → Approved`. Every SOAP section tracks `provenanceTag` and `revisionRounds` so the export contains an honest audit trail.

### `FeedbackInput`
A textarea for free-text feedback to the AI. Key design decision: **⌘+Enter submits** (familiar to most clinicians who use messaging tools). Character limit of 500 ensures the revision prompt stays focused.

### `StreamingRevision`
This is how SSE (Server-Sent Events) works on the client:

```
fetch('/api/session/revise') → ReadableStream
  ↓
getReader().read() loop
  ↓
decode UTF-8 chunks
  ↓
split on '\n', parse 'data: {...}' lines
  ↓
accumulate tokens → update textarea in real time
  ↓
on {done: true} → call onComplete with final content
```

The blinking cursor (a `<span>` with `animate-pulse`) creates the feeling of "the AI is typing right now." This is a well-established UX pattern from ChatGPT, Claude, etc.

**Why SSE instead of WebSocket?** SSE is unidirectional (server → client only), which is all we need here. It works over standard HTTP/1.1, requires no upgrade handshake, and is natively supported by all browsers with `EventSource` or `fetch + ReadableStream`.

### `RiskFlagCard` + `RiskFlagsSection`
The most safety-critical UI in the system.

- Each flag has a **left border colored by severity** (red = critical/high, amber = moderate, blue = low). Color is never the only signal — text labels always accompany it (accessibility).
- The **immediate action banner** (full-width red bar) triggers when `requiresImmediateAction: true`. This cannot be hidden or dismissed — it stays visible until the clinician acts.
- The **confirm-all gate**: the purple button that unlocks Subjective + Objective sections is disabled until every flag has been actioned. This enforces the clinical workflow: *risk first, then note*.

### `SOAPSection` — 4 state machine
This is the most complex component. It's implemented as an explicit **UI state machine** with 4 states:

| State | Trigger | What clinician can do |
|---|---|---|
| `draft` | Default | View content, see confidence, revise or approve |
| `revising` | "Revise with feedback" | Enter feedback, watch AI stream, approve or revise again |
| `editing` | "Edit directly" | Free-text edit, save invalidates downstream |
| `approved` | "Approve" | Green border, can re-edit (triggers dependency warning) |

**Dependency invalidation**: When the clinician edits `subjective`, the Zustand store's `invalidateDownstreamSections()` marks `assessment` and `plan` as needing review. The `DependencyWarning` banner then appears on those sections. This is a **data integrity pattern** — AI-generated downstream content may reference upstream content that's now been changed.

---

## 11. Batch 7 — Export System, Error States & Demo Mode

### `AgentProgress` — Polling-based visual
While the graph is running, we poll `/api/session/[id]/status` every 2 seconds and render the result as a vertical node list.

```
pending  → gray circle with small dot
running  → purple circle with animated ping ring + pulsing center dot
complete → green circle with checkmark
error    → red circle with ✕
```

The **connector lines between nodes** turn green as each agent completes — a simple visual that communicates the pipeline's sequential nature.

**Why polling?** The alternative is a WebSocket or SSE connection for status. Polling is simpler and sufficient here — 2s latency is imperceptible when processing takes 15-30 seconds total.

### PDF Generation (`generateClinicalNotePdf`)
Uses `@react-pdf/renderer` which renders **React components to PDF using a Yoga layout engine** (the same one React Native uses). This means you can write familiar JSX but it renders to PDF primitives (lines, text, rectangles) — not HTML.

Key pattern: **dynamic import at call time** to avoid SSR crashes:
```ts
// This runs only in the browser, never on the server
const [{ pdf, Document, Page, Text, View, StyleSheet }, React] = await Promise.all([
  import('@react-pdf/renderer'),
  import('react'),
]);
```

The PDF includes:
- Cover with session metadata
- Risk flags (confirmed only)
- SOAP note with confidence % and provenance tag per section
- DSM-5 diagnoses with supporting/conflicting criteria
- Treatment plan goals + interventions
- Audit trail table (Section | Action | Timestamp)
- Fixed footer on every page: "AI-assisted note · Reviewed and approved by clinician"

### FHIR R4 DocumentReference (`generateFhirDocumentReference`)
FHIR (Fast Healthcare Interoperability Resources) is the **global standard for healthcare data exchange**. A DocumentReference wraps the clinical note in a standardized envelope that any EHR system (Epic, Cerner, etc.) can ingest.

Each SOAP section becomes a separate attachment:
```json
{
  "attachment": {
    "contentType": "text/plain",
    "data": "<base64-encoded section content>",
    "title": "Subjective"
  }
}
```

The `meta.tag` array contains audit codes (`ai-assisted`, `clinician-reviewed`) using a custom coding system (`https://ehr-copilot.dev/audit`). In a real integration, these would be mapped to standard EHR audit codes.

### Error Boundary (`app/error.tsx`)
Next.js's built-in error boundary uses React's `componentDidCatch` mechanism. When any component in the tree throws, Next.js catches it and renders `error.tsx` instead of a blank page.

The pattern: `reset()` calls the component's own error boundary reset (re-renders the error boundary's subtree), while "Start over" clears the Zustand store and navigates to the beginning.

### Low Quality Transcript Error (422)
The `/api/session/process` route returns `422 Unprocessable Entity` when the transcript quality score is too low. The UI:
1. Catches the 422 specifically (not in the generic error path)
2. Shows an inline red banner with the exact quality score
3. Renders a color-coded progress bar at that score
4. Keeps the form active — the "Generate" button is still enabled so the clinician can paste a better transcript

This is a **targeted error experience** — the user knows exactly what went wrong and what to do.

### Demo Mode (`/demo`)
The demo page bypasses the entire API stack by calling `setReviewPackage(demoReviewPackage)` directly on the Zustand store. From the Review page's perspective, it's indistinguishable from a real session — all the same approval flows, risk flag confirmation, streaming revision, and export functions work.

The amber banner at the top ensures the clinician always knows they're in demo mode. The synthetic data uses `anon_demo_001` as the patient ID — impossible to confuse with a real patient ID.

**Learning note**: This pattern (loading mock data directly into state) is extremely useful for testing and onboarding. It means you can demonstrate the full UX without needing a real API key or network connection.

---

## Current Architecture at a Glance (Post-Batch 7)

```
/session/new     → Transcript upload → AgentProgress → /api/session/process
                                     ↘ 422 Low quality → inline error banner
/demo            → demoData.ts → Zustand (no API call)
/session/[id]/review → SectionContent → RiskFlagsSection | SOAPSection
                                         ↕ Zustand (locks, invalidation, approval)
/session/[id]/export → generateClinicalNotePdf | generateFhirDocumentReference
app/error.tsx    → catches any uncaught throw in the React tree
```

**State dependency chain** (enforced by Zustand + UI gates):
```
risk_flags (confirm all) → unlocks subjective + objective
subjective + objective (both approved) → unlocks assessment
assessment (approved) → unlocks plan
plan (approved) → /export page becomes accessible
```

---

## 12. Batch 8 — Final Polish, API Documentation & Production Readiness

### OpenAPI 3.0.3 Specification (`public/openapi.json`)

OpenAPI is the industry standard for documenting REST APIs. The spec lives in `public/` so it's served as a static file at `/openapi.json` — any OpenAPI-compatible tool (Postman, Insomnia, code generators) can import it directly.

Key structure:
```json
{
  "openapi": "3.0.3",
  "info": { "title": "EHR Copilot API", "version": "1.0.0" },
  "paths": { "/api/session/process": { "post": { ... } } },
  "components": { "schemas": { "SessionInput": { ... }, "ReviewPackage": { ... } } }
}
```

`components/schemas` is the reusable type library — instead of duplicating field definitions inside each endpoint, you define them once and reference them with `$ref: "#/components/schemas/ReviewPackage"`. Same principle as TypeScript's type imports.

### Hand-Built API Docs Page (`/api-docs`)

Why hand-build instead of using Swagger UI? Three reasons:
1. **Design consistency** — Swagger UI overrides all styling. Our design system looks nothing like it.
2. **Bundle size** — Swagger UI is a heavy library (600KB+). A hand-built table is a few KB.
3. **Control** — we can add curl + fetch examples, custom response code badges, and a direct download link.

The page uses a static `ENDPOINTS` array to define all three endpoints, then maps over them to render:
- Method badge (POST in purple)
- Request body table (field name, type, required, description)
- Response fields table
- HTTP status code badges (green for 2xx, amber for 4xx, red for 5xx)
- Side-by-side curl + JavaScript code blocks

### `Skeleton.tsx` — Pulse Animation Loading States

Skeleton screens are a well-established pattern that **reduces perceived load time**. Instead of a blank area or a spinner (which signal "wait"), a skeleton shows the shape of the content — the brain interprets this as "almost ready."

Implementation: a `div` with `bg-[#E5E7EB] animate-pulse rounded-lg` — Tailwind's `animate-pulse` applies a CSS animation that cycles between 100% and 50% opacity.

Three variants:
- `Skeleton` — base block (any size)
- `SectionSkeleton` — full SOAP section layout with placeholder bars
- `ReviewDashboardSkeleton` — sidebar + main content structure
- `StreamingSkeleton` — content area shown while revision loads

Applied in `SectionContent` when `reviewPackage` is null and `processingStatus !== 'idle'`.

### `Toast.tsx` + `useToast` — Notification System

The toast system uses **React context** to provide a global notification API without prop drilling. Any component in the tree can call `useToast()` and fire notifications.

Key design decisions:
- **Max 3 stacked** — more than 3 simultaneous toasts is visually overwhelming
- **Slide-in from right** — uses CSS `translate-x` transition. `opacity-0 translate-x-8` → `opacity-100 translate-x-0` triggered by a `setTimeout(() => setVisible(true), 10)` — the tiny delay gives the browser one frame to mount the element at its starting state before the transition fires.
- **Persistent errors** — error toasts have no `duration` (undefined = persistent). A clinician should never miss an API error.
- **Action buttons** — amber "invalidated" toasts show a "Review now" link. This is a common pattern in Notion, Linear, and other tools — the notification doubles as a navigation shortcut.

Pre-built helpers in `useClinicalToasts()`:
```ts
sectionApproved('Subjective') // green, 2s
revisionComplete('Plan')      // purple, 3s
sectionInvalidated('Assessment', navigateFn) // amber, 4s + action
exportSuccess('PDF')          // green, 2s
apiError('Server error 500')  // red, persistent
```

### `useKeyboardShortcuts.tsx` — Global Shortcuts

Keyboard shortcuts are implemented with `window.addEventListener('keydown', handler)` inside `useEffect`. The cleanup `return () => window.removeEventListener(...)` prevents memory leaks when the component unmounts.

Critical guard: `if (isInput) return` — single-letter shortcuts (`A`, `E`, `R`) must not fire when the user is typing in a textarea or input field. We check `e.target.tagName === 'INPUT' || 'TEXTAREA' || isContentEditable`.

The `ShortcutHint` component renders a `<kbd>` element — `<kbd>` is the correct semantic HTML for keyboard input. Styled as a small gray pill (similar to how macOS keyboard shortcuts appear in menus), it's hidden on mobile (`hidden sm:inline-flex`) since touch UIs don't have keyboard shortcuts.

### Responsive Design

The primary target is desktop (clinicians use workstations with large monitors), but tablet support (768px+) was added:

| Breakpoint | Change |
|---|---|
| `< 768px` | Nav collapses to hamburger → full-screen overlay |
| `< 900px` | New session form goes single-column |
| `< 768px` | Export cards stack vertically |

The hamburger uses **CSS transforms** (`rotate-45`, `translate-y-2`) on three `<span>` bars to animate from ☰ to ✕. It's pure CSS — no icon library needed.

### Docker Deployment (`Dockerfile` + `docker-compose.yml`)

Multi-stage Docker builds keep the final image small:

```
Stage 1: builder (node:18-alpine)
  → Install pnpm + dependencies
  → Build agents package (pnpm --filter agents build)
  → Build Next.js (pnpm --filter web build)
  → Output: .next/standalone/ (self-contained Node server)

Stage 2: runner (node:18-alpine)
  → Copy only the standalone output
  → Run as non-root user (nextjs:nodejs, UID 1001)
  → CMD: node apps/web/server.js
```

`next build` with `output: 'standalone'` (in next.config) creates a self-contained Node.js server that doesn't need `node_modules` at runtime — the image is dramatically smaller.

The non-root user (`adduser --system --uid 1001 nextjs`) is a security practice — if the container is compromised, the attacker doesn't have root inside it.

### Step 8 Integration Check — Wiring Gaps Found & Fixed

**Gap 1: `risk_flags` approval didn't unlock `subjective` + `objective`**
- Root cause: the `approveSection` logic only checked if both sub+obj were approved to unlock assessment, but never handled `risk_flags → sub + obj` unlock
- Fix: added explicit `if (section === 'risk_flags') { unlock subjective + objective }` branch in the store

**Gap 2: Initial section statuses were wrong**
- Root cause: `subjective` and `objective` were initialized as `'draft'` — accessible immediately
- Correct flow: everything except `risk_flags` starts `'locked'`; the approval chain unlocks them sequentially
- Fix: changed `INITIAL_STATUSES` to set `subjective`, `objective`, `assessment`, `plan` all to `'locked'`

**Gap 3: `updateSectionContent` action was missing from the store**
- Root cause: `SOAPSection` called `onEdit(content)`, but `SectionContent` only called `editSection(key)` (status change) without persisting the new content to `reviewPackage.soapNote`
- Fix: added `updateSectionContent(section, content)` to the Zustand store — does an immutable deep merge into `reviewPackage.soapNote[section].content`
- `SectionContent` now calls both `updateSectionContent` + `editSection` on save

**Gap 4: Streamed revision content not persisted**
- Root cause: `handleApproveStreamedVersion` in `SOAPSection` set local state but didn't call back to the parent with the new content
- Fix: added `onRevisionComplete?: (content: string) => void` prop; called in `handleApproveStreamedVersion`; `SectionContent` calls `updateSectionContent(soapKey, content)` + `markRevised(soapKey)` via this prop

**Gap 5: Stale legacy component files causing TypeScript errors**
- Files: `RiskFlags.tsx`, `SOAPReview.tsx`, `DiagnosisPanel.tsx`, `ExportPanel.tsx`, `TranscriptForm.tsx`, `TreatmentPlan.tsx`, `session/page.tsx`
- These were pre-Batch 6 implementations using the old `ehr-store.ts` type system, now incompatible
- Fix: stubbed each to `export default function X() { return null; }` — eliminates errors without removing files (safe if anything imports them)

**Final check result: 0 TypeScript errors** (with `--skipLibCheck`)

### Verified End-to-End Flow

```
1. /demo → demoData.ts → Zustand (no API) ✓
   /session/new → submit → AgentProgress overlay → POST /api/session/process ✓
   422 low quality → inline red banner with score bar ✓

2. reviewPackage → Zustand → /session/[id]/review ✓
   SectionContent → skeleton while loading ✓

3. risk_flags confirmed → approveSection('risk_flags')
   → store unlocks subjective + objective ✓

4. subjective approved + objective approved
   → store unlocks assessment ✓
   assessment approved → store unlocks plan ✓

5. section edited → updateSectionContent + editSection
   → invalidateDownstreamSections → DependencyWarning ✓

6. POST /api/session/revise → SSE stream → StreamingRevision
   → handleApproveStreamedVersion → onRevisionComplete
   → updateSectionContent + markRevised ✓

7. all 5 approved → selectAllApproved = true
   → export page accessible ✓
   → generateClinicalNotePdf → Blob → download ✓
   → generateFhirDocumentReference → JSON → download ✓
   → plain text → navigator.clipboard ✓
```

---

## Final File Map (Batch 6–8 only)

```
apps/web/src/
├── app/
│   ├── layout.tsx                    ← ToastProvider wrapper
│   ├── error.tsx                     ← Global error boundary
│   ├── demo/page.tsx                 ← Demo mode entry point
│   ├── api-docs/page.tsx             ← Hand-built API docs
│   └── session/
│       ├── new/page.tsx              ← Transcript form + AgentProgress + 422 error
│       └── [id]/
│           ├── review/page.tsx       ← Shell: SectionNav + SectionContent
│           └── export/page.tsx       ← PDF + FHIR + text export
├── components/
│   ├── layout/Nav.tsx                ← Responsive hamburger nav
│   ├── processing/AgentProgress.tsx  ← Polling agent progress visualizer
│   ├── review/
│   │   ├── SectionContent.tsx        ← Routes to RiskFlagsSection or SOAPSection
│   │   ├── ConfidenceBar.tsx         ← Colored confidence fill bar
│   │   ├── ProvenanceTag.tsx         ← Audit provenance pill
│   │   └── sections/
│   │       ├── RiskFlagsSection.tsx  ← Risk flag list + confirm-all gate
│   │       ├── RiskFlagCard.tsx      ← Individual flag card
│   │       ├── SOAPSection.tsx       ← 4-state SOAP section machine
│   │       ├── StreamingRevision.tsx ← SSE consumer with cursor
│   │       ├── FeedbackInput.tsx     ← Feedback textarea
│   │       ├── DependencyWarning.tsx ← Amber upstream-changed banner
│   │       └── ConfidenceBar.tsx
│   └── ui/
│       ├── Skeleton.tsx              ← Pulse skeleton loading states
│       └── Toast.tsx                 ← Slide-in toast system
├── hooks/
│   └── useKeyboardShortcuts.tsx      ← A/E/R/arrows/Cmd+Enter shortcuts
├── lib/
│   ├── store/sessionStore.ts         ← Zustand — full clinical session state
│   ├── demo/demoData.ts              ← Synthetic ReviewPackage (no PHI)
│   ├── export/
│   │   ├── generatePdf.tsx           ← @react-pdf/renderer clinical note
│   │   └── generateFhir.ts           ← FHIR R4 DocumentReference
│   └── fhir/buildFHIRBundle.ts       ← Full FHIR R4 Bundle (for API use)
└── app/api/
    ├── session/process/route.ts      ← POST: transcript → ReviewPackage
    ├── session/revise/route.ts       ← POST: SSE streaming revision
    └── session/finalize/route.ts     ← POST: FHIR Bundle export

apps/web/
├── Dockerfile                        ← Multi-stage node:18-alpine build
├── .env.example                      ← All env vars documented
└── public/openapi.json               ← OpenAPI 3.0.3 spec

soap/
├── README.md                         ← Full project docs + setup guide
└── docker-compose.yml                ← Web service + healthcheck
```
