# EHR Copilot

AI-powered mental health clinical documentation assistant. EHR Copilot processes therapy session transcripts through a multi-agent LangGraph pipeline to produce structured SOAP notes, risk flags, DSM-5 diagnostic suggestions, and treatment plans — all subject to mandatory clinician review and approval before export.

Built for mental health clinicians who need to reduce documentation time without compromising clinical accuracy or patient safety. Every AI output is confidence-scored, provenance-tracked, and gated behind explicit clinician approval before it can be exported.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  apps/web  (Next.js 16.2.1)                                 │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  /session   │  │  Zustand Store   │  │  API Routes   │  │
│  │  /new       │→ │  sectionStatuses │→ │  /process     │  │
│  │  /[id]/     │  │  reviewPackage   │  │  /revise(SSE) │  │
│  │  review     │  │  auditLog        │  │  /finalize    │  │
│  │  export     │  └──────────────────┘  └───────┬───────┘  │
│  └─────────────┘                                │           │
└────────────────────────────────────────────────-│-----------┘
                                                  │
┌─────────────────────────────────────────────────▼-----------┐
│  packages/agents  (LangGraph.js)                            │
│                                                             │
│  transcriptQualityNode → soapNode → riskNode                │
│                                   → dsmNode → planNode      │
│                                             → reviewBundlerNode │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router) |
| Agent orchestration | LangGraph.js + LangChain.js |
| LLM | Google Gemini 2.5 Flash (all agents) |
| State management | Zustand 5 |
| Styling | Tailwind CSS 3 |
| Schema validation | Zod |
| PDF export | @react-pdf/renderer |
| Healthcare standard | FHIR R4 |
| Package manager | pnpm workspaces |
| Language | TypeScript (strict) |

---

## Setup

### Prerequisites
- Node.js 18+
- pnpm 9+ (`npm install -g pnpm`)
- OpenAI API key

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment
```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local and add your OPENAI_API_KEY
```

### 3. Run development server
```bash
pnpm dev
# Opens http://localhost:3000
```

### 4. (Optional) Build for production
```bash
pnpm --filter web build
pnpm --filter web start
```

### Docker
```bash
docker compose up --build
```

---

## Demo Mode

No API key required for demo. Visit:

```
http://localhost:3000/demo
```

This loads a synthetic therapy session (no real patient data) with a full SOAP note, 2 risk flags, DSM-5 diagnosis, and treatment plan. All features — review, approve, revise, and export — work in demo mode.

---

## API Reference

See the full API documentation at:
- **Interactive docs**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **OpenAPI spec**: [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json)

### Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/session/process` | Process transcript → ReviewPackage |
| POST | `/api/session/revise` | Revise SOAP section (SSE streaming) |
| POST | `/api/session/finalize` | Export FHIR R4 Bundle |

---

## Dependency Chain (Clinical Workflow)

```
risk_flags (confirm all)
  → unlocks: subjective + objective
    → both approved: unlocks assessment
      → approved: unlocks plan
        → all 5 approved: export available
```

---

## Security Notes

- No real patient data should ever be entered. Use anonymized IDs only.
- The transcript undergoes a basic PII regex check before processing.
- Rate limiting: 10 requests/min per IP on `/api/session/process`.
- Security headers (CSP, HSTS, X-Frame-Options) are applied via Next.js middleware.
- All AI outputs require explicit clinician action before they appear in exports.

---

## License

MIT
