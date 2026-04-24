import { inngest } from '@/lib/inngest';
import { ehrGraph } from 'agents';
import type { SessionInput, GraphState, ReviewPackage } from 'agents';
import { setSessionStatus, setReviewPackage, setSessionInput } from '@/lib/redis';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { AsyncLocalStorage } from 'node:async_hooks';
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons';

// Initialize global ALS for LangChain tracing inside Next.js/Inngest context
try {
  AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new AsyncLocalStorage());
} catch (e) {
  // Ignore if already initialized
}

// ─── Node → Redis Progress Map ─────────────────────────────────────────────────
const NODE_PROGRESS = {
  transcriptQualityNode:  { currentNode: 'transcriptQualityNode', percentComplete: 15 },
  soapNode:               { currentNode: 'soapNode',              percentComplete: 40 },
  riskNode:               { currentNode: 'riskNode',              percentComplete: 55 },
  dsmNode:                { currentNode: 'dsmNode',               percentComplete: 65 },
  hallucinationGuardNode: { currentNode: 'hallucinationGuardNode', percentComplete: 70 },
  planNode:               { currentNode: 'planNode',              percentComplete: 80 },
  reviewBundlerNode:      { currentNode: 'reviewBundlerNode',     percentComplete: 90 },
} as const;

// ─── EHR Processing Background Function ───────────────────────────────────────
// WHY no step.run()?
//   step.run() sends a new HTTP request to /api/inngest for each step.
//   Every HTTP request in Next.js is a fresh Node.js context — AsyncLocalStorage
//   (used by LANGCHAIN_TRACING_V2) is destroyed at that boundary.
//   Result: LangSmith never sees the root LangGraph trace, only individual model calls.
//
//   Fix: call ehrGraph.stream() directly in the Inngest function body.
//   Inngest still handles fire-and-forget async execution.
//   The single /api/inngest call runs the full graph in one Node.js context,
//   so AsyncLocalStorage propagates correctly → unified LangGraph trace in LangSmith.
//
//   Vercel timeout: maxDuration=300 is set on /api/inngest/route.ts (Pro plan).

export const processSessionFunction = inngest.createFunction(
  {
    id: 'process-ehr-session',
    retries: 0,
    triggers: [{ event: 'session/process.requested' }],
  },
  async ({ event }) => {
    const { sessionId, input } = event.data as { sessionId: string; input: SessionInput };

    let errorState: string | null = null;
    let qualityScore = 1.0;
    let finalReviewPackage: ReviewPackage | null = null;

    const tracingEnabled = process.env.LANGCHAIN_TRACING_V2 === 'true';
    console.log('>>> [Inngest] LANGCHAIN_TRACING_V2:', process.env.LANGCHAIN_TRACING_V2);
    console.log('>>> [Inngest] LANGCHAIN_PROJECT:', process.env.LANGCHAIN_PROJECT);

    const tracer = new LangChainTracer({
      projectName: process.env.LANGCHAIN_PROJECT || 'ehr-copilot',
    });

    const stream = await ehrGraph.stream(
      { input }, 
      { 
        streamMode: 'updates',
        callbacks: [tracer],
      }
    );

    for await (const chunk of stream) {
      for (const [nodeName, nodeOutput] of Object.entries(chunk)) {
        const out = nodeOutput as Partial<GraphState>;

        if (out.error) errorState = out.error;
        if (typeof out.transcriptQualityScore === 'number') {
          qualityScore = out.transcriptQualityScore;
        }
        if (out.reviewPackage) {
          finalReviewPackage = out.reviewPackage as ReviewPackage;
        }

        // Push Redis progress as each node completes
        const progress = NODE_PROGRESS[nodeName as keyof typeof NODE_PROGRESS];
        if (progress) {
          await setSessionStatus(sessionId, { status: 'processing', ...progress });
        }
      }
    }

    // ── Error / quality gate ────────────────────────────────────────────────
    if (errorState || qualityScore < 0.4) {
      await setSessionStatus(sessionId, {
        status: 'error',
        currentNode: 'transcriptQualityNode',
        percentComplete: 15,
        error: errorState ?? 'LOW_QUALITY_TRANSCRIPT: Score below threshold',
      });
      return { status: 'error' };
    }

    if (!finalReviewPackage) {
      await setSessionStatus(sessionId, {
        status: 'error',
        currentNode: 'reviewBundlerNode',
        percentComplete: 90,
        error: 'GRAPH_ERROR: reviewBundlerNode did not produce a review package',
      });
      return { status: 'error' };
    }

    // ── Persist to Redis ────────────────────────────────────────────────────
    await Promise.all([
      setSessionStatus(sessionId, {
        status: 'complete',
        currentNode: 'reviewBundlerNode',
        percentComplete: 100,
      }),
      setReviewPackage(sessionId, finalReviewPackage),
      setSessionInput(sessionId, input),
    ]);

    console.log(`>>> [Inngest] Redis writes complete for session: ${sessionId}`);
    console.log(`>>> [Inngest] reviewPackage keys: ${Object.keys(finalReviewPackage).join(', ')}`);

    return { status: 'complete', sessionId };
  },
);
