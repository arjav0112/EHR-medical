# EHR Copilot - Low Level Design

This document is based on the current codebase in `apps/web` and `packages/agents`, not only on README or older work notes. A few repo docs are partially stale; the design below reflects the implementation as it exists today.

## 1. System Summary

EHR Copilot is an AI-assisted clinical documentation platform for mental health workflows. It converts a therapist session transcript into:

- a structured SOAP note
- risk flags
- DSM-5 diagnosis suggestions
- a treatment plan
- exportable PDF and FHIR outputs

The system is designed around a human-in-the-loop review model:

1. AI generates a clinical draft.
2. Risk is reviewed first.
3. SOAP sections are approved in dependency order.
4. Clinician edits and AI revisions are provenance-tracked.
5. Export is unlocked only after required approvals.

## 2. Primary Quality Attributes

The implementation optimizes for:

- Safety: risk-first workflow, hallucination audit, explicit approval gates
- Traceability: confidence, provenance tags, audit log, citations
- Responsiveness: async background processing with Redis-backed polling
- Recoverability: session state cached in Redis and later persisted to Firestore
- Modularity: agent pipeline isolated in a separate workspace package

## 3. Monorepo Structure

```text
soap/
|-- apps/web/            Next.js application
|-- packages/agents/     LangGraph + Gemini multi-agent pipeline
|-- firestore.rules      Firestore access rules
|-- vercel.json          Vercel deployment config
|-- docker-compose.yml   Local container run path
```

### 3.1 `apps/web`

Owns:

- App Router pages and layouts
- API routes
- Firebase Auth integration
- Firestore client access
- Redis access for processing state
- Inngest background orchestration entrypoints
- review/export UI
- payment, avatar upload, and observability glue

### 3.2 `packages/agents`

Owns:

- canonical shared domain types
- `SessionInputSchema` runtime validation schema
- LangGraph graph definition
- individual AI nodes
- streaming revision agent

This separation is good architecture because the agent engine is not coupled to Next.js runtime concerns.

## 4. High-Level Runtime Topology

```text
Browser
  |
  v
Next.js App Router (apps/web)
  |
  +--> API routes
  |     +--> Redis (Upstash) for transient process state + cached review package
  |     +--> Inngest event trigger for long-running processing
  |     +--> Firestore client SDK usage for user/session persistence
  |     +--> Cloudinary for avatar uploads
  |     +--> Razorpay for payments
  |
  +--> Zustand session store
  +--> Firebase Auth context
  |
  v
Inngest background function
  |
  v
LangGraph workflow (packages/agents)
  |
  v
Gemini 2.5 Flash via LangChain
```

## 5. Main Bounded Contexts

### 5.1 Clinical Processing Context

Transforms raw transcript input into a `ReviewPackage`.

Key files:

- `packages/agents/src/graph.ts`
- `packages/agents/src/agents/*.ts`
- `apps/web/src/inngest/functions.ts`

### 5.2 Review Workflow Context

Controls clinician gating, editing, revision, invalidation, and approval sequencing.

Key files:

- `apps/web/src/lib/store/sessionStore.ts`
- `apps/web/src/components/review/*`

### 5.3 Persistence Context

Uses two storage classes:

- Redis for fast ephemeral processing state and page-refresh recovery
- Firestore for durable user, billing, and session history

### 5.4 Export Context

Builds PDF and FHIR outputs from the reviewed package.

Key files:

- `apps/web/src/lib/export/generatePdf.tsx`
- `apps/web/src/lib/fhir/buildFHIRBundle.ts`
- `apps/web/src/app/api/session/finalize/route.ts`

### 5.5 Identity and Commercial Context

- Firebase Auth for sign-in/sign-up
- Firestore `users` collection for plan and usage metadata
- Razorpay for subscription checkout
- Cloudinary for avatar storage

## 6. Core Domain Model

The canonical data contracts live in `packages/agents/src/types/index.ts`.

### 6.1 Input Model

`SessionInput`

- `session`: transcript, session type, modality, duration, session number
- `patient`: anonymized id, age, gender, diagnoses, medications
- `priorNotes`: previous note summaries
- `clinicianPreferences`: note verbosity and risk preferences

### 6.2 Intermediate Graph Model

`GraphState`

- `input`
- `transcriptQualityScore`
- `soapNote`
- `riskFlags`
- `diagnosisSuggestions`
- `treatmentPlan`
- `hallucinationReport`
- `reviewPackage`
- `auditLog`
- `error`

Reducers in `graph.ts` decide whether values append or replace.

### 6.3 Output Model

`ReviewPackage`

- `sessionId`
- `reviewStatus`
- `riskFlags`
- `soapNote`
- `diagnosisSuggestions`
- `treatmentPlan`
- `overallRiskLevel`
- `agentMetadata`
- `auditLog`

### 6.4 UI State Model

Zustand maintains a separate review workflow state:

- `activeSection`
- `sectionStatuses`
- `invalidatedSections`
- `processingStatus`
- `reviewPackage`
- `input`

This is important: domain state and UI workflow state are intentionally separate.

## 7. Agent Pipeline Design

The current graph is:

```text
transcriptQualityNode
  -> soapNode
      -> riskNode
      -> dsmNode
      -> hallucinationGuardNode
riskNode -> planNode
dsmNode -> reviewBundlerNode
planNode -> reviewBundlerNode
hallucinationGuardNode -> reviewBundlerNode
```

### 7.1 Why SOAP Runs Before Risk

This is a deliberate change from the earlier parallel-first idea. `riskNode` now uses `soapNote.objective.content` as additional MSE context, so SOAP must exist first.

### 7.2 Node Responsibilities

`transcriptQualityNode`

- validates transcript usefulness
- computes quality score
- terminates early if score < 0.4

`soapNode`

- generates all SOAP sections in one call
- enriches Objective with barometers
- enriches Assessment with a criteria table
- initializes section provenance as `ai_drafted`

`riskNode`

- detects risk flags
- enforces evidence-based flags
- documents SI/HI denial or presence
- marks immediate-action scenarios

`dsmNode`

- proposes primary and differential diagnoses
- compares suggestions against known diagnoses

`hallucinationGuardNode`

- independently audits SOAP grounding
- overrides self-reported section confidence
- writes hallucination metadata back into `soapNote`

`planNode`

- generates treatment plan from SOAP, risk, and prior notes
- returns `null` if immediate-risk handling should block normal planning

`reviewBundlerNode`

- assembles final `ReviewPackage`
- computes overall risk level
- composes metadata and audit entries

## 8. End-to-End Processing Sequence

### 8.1 Transcript Submission

1. User submits from `/session/new`.
2. Client validates basic fields and checks quota through Firestore-backed helper logic.
3. `POST /api/session/process` validates JSON via `SessionInputSchema`.
4. Route checks transcript for simple PII patterns.
5. Route creates `sessionId`.
6. Route stores initial Redis status.
7. Route emits `session/process.requested` to Inngest.
8. Client polls `/api/session/status/[sessionId]`.

### 8.2 Background Processing

1. Inngest receives event.
2. `ehrGraph.stream(..., { streamMode: 'updates' })` runs in a single background function.
3. After each node, progress is mapped to Redis.
4. When complete:
   - Redis status is marked `complete`
   - review package is stored under `review:{sessionId}`
   - input is stored under `input:{sessionId}`

### 8.3 Review Page Hydration

1. Preferred path: in-memory Zustand already has the package.
2. Refresh path: `/api/session/[id]/review` loads from Redis.
3. Fallback path: if Redis no longer has the payload, Firestore session record is loaded.

This gives the system a layered recovery strategy.

## 9. Review Workflow State Machine

Section ordering is enforced in Zustand:

```text
risk_flags approved
  -> subjective unlocked
  -> objective unlocked

subjective approved + objective approved
  -> assessment unlocked

assessment approved
  -> plan unlocked

all sections approved
  -> export enabled
```

### 9.1 SOAP UI States

Each SOAP section component supports these local modes:

- `draft`
- `editing`
- `revising`
- `approved`

### 9.2 Edit Invalidation Logic

If an upstream section changes:

- downstream sections are marked back to `draft`
- a dependency warning is shown
- user can keep the downstream content or re-sync it via AI revision

This is a strong design choice because it encodes clinical dependency, not just UI status.

## 10. Revision Flow

Section refinement is not part of LangGraph. It is a standalone streaming workflow:

1. Client sends section, feedback, approved context, transcript, patient context.
2. `POST /api/session/revise` calls `reviseSection()`.
3. The agent streams token chunks over SSE.
4. Frontend accumulates tokens in `StreamingRevision`.
5. Final accepted revision updates:
   - section content
   - confidence
   - provenance
   - revision rounds
6. Updated review package is persisted to Redis and Firestore.

## 11. Persistence Design

### 11.1 Redis

Purpose: short-lived operational state.

Keys:

- `session:{id}` -> process status, node, completion percent
- `review:{id}` -> serialized `ReviewPackage`
- `input:{id}` -> serialized `SessionInput`

TTL:

- 24 hours

Why Redis here:

- low latency
- good for polling
- suitable for background status sharing across requests

### 11.2 Firestore

Purpose: durable business data.

Collections:

- `users/{uid}`
- `users/{uid}/sessions`
- `sessions/{sessionId}`

Stored concepts:

- account profile
- subscription tier
- monthly usage snapshot
- session history
- reviewed package for later retrieval

## 12. Export Architecture

### 12.1 PDF

`generateClinicalNotePdf()` dynamically imports `@react-pdf/renderer` and produces a clinician-readable document containing:

- confirmed risk flags
- SOAP sections
- diagnosis list
- treatment plan
- audit trail

### 12.2 FHIR

`buildFHIRBundle()` constructs:

- `DocumentReference` for the overall note
- `Observation` per SOAP section
- `Condition` per diagnosis suggestion
- `Observation` per confirmed risk flag

The `finalize` API enforces that all required sections are approved before returning FHIR.

## 13. Security and Compliance Controls

Implemented controls:

- request validation with Zod
- PII regex guard on transcript submission
- Redis-backed rate limiting in `src/proxy.ts`
- request size guard for transcript-heavy endpoints
- CSP, HSTS, X-Frame-Options, Referrer-Policy
- explicit clinician approval before export
- audit log carried into output package

## 14. Observability

Current observability stack:

- Sentry for runtime monitoring
- structured logger for local/prod logging
- LangChain tracer for model/graph tracing when enabled

Notable design detail:

- Inngest processing runs the graph directly in one function body to preserve AsyncLocalStorage and unified LangChain tracing.

## 15. Important Architectural Tradeoffs

### 15.1 Why split Redis and Firestore?

Redis is used for fast transient state; Firestore is used for durable user and session history. This avoids using Firestore as a progress bus while still keeping a durable clinical record.

### 15.2 Why polling instead of WebSockets?

The current system uses polling because:

- background work is already stateful in Redis
- operational complexity is lower than socket infra
- user experience is acceptable for 15 to 30 second jobs

### 15.3 Why separate revision from the main graph?

The initial graph is batch-oriented. Revision is interactive, user-driven, and streaming, so it is intentionally modeled as a separate path.

## 16. Current Technical Debt and Gaps

These are good architect interview talking points.

1. Some repo docs are stale.
   README and work notes still describe an older flow in places; actual implementation uses Gemini, Inngest, Redis, and a hallucination guard node.

2. Persistence is mixed client/server.
   Firestore session writes and quota checks happen from the client layer, which is fast to ship but weaker from a trust-boundary standpoint than a server-owned persistence service.

3. Two status APIs exist.
   There is both `/api/session/[id]/status` and `/api/session/status/[sessionId]`, which suggests an evolution in API shape and should be consolidated.

4. `AgentProgress` has a partially stale live contract.
   The live component expects agent-level status structure that does not fully match the current status route, which is why the main path uses animated non-live mode today.

5. Docker healthcheck references `/api/health`, but that route is not present.
   This is an operational gap.

6. Firestore access appears to use the client SDK even in server-labeled helpers.
   For production-grade backend enforcement, an Admin SDK or server-owned data service would be safer.

7. Review/export pages still contain some mock and preview fallback logic.
   This is useful for demos but should be isolated more cleanly from production paths.

## 17. Recommended Evolution Roadmap

### Phase 1

- unify status endpoints
- add real healthcheck route
- move quota enforcement to server-side trusted path
- normalize session save path so server persists the canonical record

### Phase 2

- introduce repository/service layer around Redis + Firestore
- replace polling with SSE progress or WebSocket only if UX requires it
- add stronger PII detection and de-identification
- add explicit clinician action persistence for each approval/revision event

### Phase 3

- move Firestore server operations to Admin SDK
- add formal policy engine for role-based review/export actions
- separate demo-mode artifacts from production modules
- add versioned export contracts for downstream EHR integrations

## 18. Suggested Architect Interview Narrative

A clean way to explain this system:

1. "This is a monorepo with a Next.js application and a decoupled LangGraph agent package."
2. "The synchronous web tier only validates input and schedules background work."
3. "Long-running AI orchestration happens in Inngest, with Redis as the operational state layer."
4. "The output is a typed `ReviewPackage`, which becomes the source of truth for the review workflow."
5. "The review UI is intentionally dependency-aware: risk first, then SOAP approvals in order."
6. "Durable history lives in Firestore, while Redis is used for ephemeral progress and refresh recovery."
7. "The main tradeoff today is client-heavy Firestore interaction; my next step would be moving more trust-critical persistence behind server-owned services."

