import { inngest } from '@/lib/inngest';
import {
  transcriptQualityNode,
  soapNode,
  riskNode,
  dsmNode,
  planNode,
  hallucinationGuardNode,
  reviewBundlerNode,
} from 'agents';
import type { GraphState } from 'agents';
import { setSessionStatus, setReviewPackage, setSessionInput } from '@/lib/redis';
import type { SessionInput } from 'agents';

// ─── EHR Processing Background Function ───────────────────────────────────────
// Each step.run() is a separate Vercel function invocation (< 60s each).
// Total execution can span minutes — Inngest manages the orchestration.

export const processSessionFunction = inngest.createFunction(
  {
    id: 'process-ehr-session',
    retries: 0, // Don't retry LLM calls — they're expensive and non-idempotent
    triggers: [{ event: 'session/process.requested' }],
  },
  async ({ event, step }) => {
    const { sessionId, input } = event.data as { sessionId: string; input: SessionInput };

    // ── Step 1: Transcript Quality Check (~3s) ─────────────────────────────────
    const qualityResult = await step.run('transcript-quality-check', async () => {
      const baseState = makeBaseState(input);
      return transcriptQualityNode(baseState);
    });

    if (qualityResult.error || (qualityResult.transcriptQualityScore ?? 0) < 0.4) {
      await setSessionStatus(sessionId, {
        status: 'error',
        currentNode: 'transcriptQualityNode',
        percentComplete: 15,
        error: qualityResult.error ?? 'LOW_QUALITY_TRANSCRIPT: Score below threshold',
      });
      return { status: 'rejected', reason: qualityResult.error };
    }

    await setSessionStatus(sessionId, {
      status: 'processing',
      currentNode: 'soapNode',
      percentComplete: 20,
    });

    // ── Step 2: SOAP Note Generation (~33s) ────────────────────────────────────
    const soapResult = await step.run('soap-note-generation', async () => {
      const state = makeBaseState(input, { transcriptQualityScore: qualityResult.transcriptQualityScore });
      return soapNode(state);
    });

    if (soapResult.error) {
      await setSessionStatus(sessionId, { status: 'error', currentNode: 'soapNode', percentComplete: 40, error: soapResult.error });
      return { status: 'error', step: 'soap', error: soapResult.error };
    }

    await setSessionStatus(sessionId, {
      status: 'processing',
      currentNode: 'riskNode',
      percentComplete: 50,
    });

    // ── Step 3: Parallel Analysis — Risk + DSM + Hallucination Guard (~18s) ────
    // All three can run concurrently using soapNote — Inngest parallelises these
    const [riskResult, dsmResult, hallucinationResult] = await Promise.all([
      step.run('risk-analysis', async () => {
        const state = makeBaseState(input, {
          transcriptQualityScore: qualityResult.transcriptQualityScore,
          soapNote: soapResult.soapNote ?? {},
        });
        return riskNode(state);
      }),
      step.run('dsm-analysis', async () => {
        const state = makeBaseState(input, {
          transcriptQualityScore: qualityResult.transcriptQualityScore,
          soapNote: soapResult.soapNote ?? {},
        });
        return dsmNode(state);
      }),
      step.run('hallucination-guard', async () => {
        const state = makeBaseState(input, {
          transcriptQualityScore: qualityResult.transcriptQualityScore,
          soapNote: soapResult.soapNote ?? {},
        });
        return hallucinationGuardNode(state);
      }),
    ]);

    await setSessionStatus(sessionId, {
      status: 'processing',
      currentNode: 'planNode',
      percentComplete: 75,
    });

    // ── Step 4: Treatment Plan (~15s, needs riskFlags) ─────────────────────────
    const planResult = await step.run('treatment-plan', async () => {
      const state = makeBaseState(input, {
        transcriptQualityScore: qualityResult.transcriptQualityScore,
        soapNote: soapResult.soapNote ?? {},
        riskFlags: riskResult.riskFlags ?? [],
        diagnosisSuggestions: dsmResult.diagnosisSuggestions ?? [],
      });
      return planNode(state);
    });

    await setSessionStatus(sessionId, {
      status: 'processing',
      currentNode: 'reviewBundlerNode',
      percentComplete: 90,
    });

    // ── Step 5: Bundle Final Review Package (fast) ─────────────────────────────
    const bundleResult = await step.run('review-bundler', async () => {
      const state = makeBaseState(input, {
        transcriptQualityScore: qualityResult.transcriptQualityScore,
        soapNote: soapResult.soapNote ?? {},
        riskFlags: riskResult.riskFlags ?? [],
        diagnosisSuggestions: dsmResult.diagnosisSuggestions ?? [],
        treatmentPlan: planResult.treatmentPlan ?? null,
        hallucinationReport: hallucinationResult.hallucinationReport ?? null,
        auditLog: [
          ...(qualityResult.auditLog ?? []),
          ...(soapResult.auditLog ?? []),
          ...(riskResult.auditLog ?? []),
          ...(dsmResult.auditLog ?? []),
          ...(planResult.auditLog ?? []),
          ...(hallucinationResult.auditLog ?? []),
        ],
      });
      return reviewBundlerNode(state);
    });

    // ── Persist to Redis ───────────────────────────────────────────────────────
    await Promise.all([
      setSessionStatus(sessionId, {
        status: 'complete',
        currentNode: 'reviewBundlerNode',
        percentComplete: 100,
      }),
      setReviewPackage(sessionId, bundleResult.reviewPackage!),
      setSessionInput(sessionId, input),
    ]);

    return { status: 'complete', sessionId };
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBaseState(input: SessionInput, partial: Partial<GraphState> = {}): GraphState {
  return {
    input,
    transcriptQualityScore: 0,
    soapNote: {},
    riskFlags: [],
    diagnosisSuggestions: [],
    treatmentPlan: null,
    reviewPackage: null,
    hallucinationReport: null,
    auditLog: [],
    error: null,
    ...partial,
  };
}
