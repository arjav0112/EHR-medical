import { inngest } from '@/lib/inngest';
import { ehrGraph } from 'agents';
import type { SessionInput, GraphState } from 'agents';
import { setSessionStatus, setReviewPackage, setSessionInput } from '@/lib/redis';

// ─── Node → Redis Progress Map ─────────────────────────────────────────────────
const NODE_PROGRESS: Record<string, { currentNode: string; percentComplete: number }> = {
  transcriptQualityNode:  { currentNode: 'transcriptQualityNode', percentComplete: 15 },
  soapNode:               { currentNode: 'soapNode',              percentComplete: 40 },
  riskNode:               { currentNode: 'riskNode',              percentComplete: 55 },
  dsmNode:                { currentNode: 'dsmNode',               percentComplete: 65 },
  hallucinationGuardNode: { currentNode: 'hallucinationGuardNode', percentComplete: 70 },
  planNode:               { currentNode: 'planNode',              percentComplete: 80 },
  reviewBundlerNode:      { currentNode: 'reviewBundlerNode',     percentComplete: 90 },
};

// ─── EHR Processing Background Function ───────────────────────────────────────
// Single step.run() invokes the full LangGraph — gives:
//   ✓ Unified LangGraph trace in LangSmith (just like before)
//   ✓ Correct state management (LangGraph's own reducers handle merging)
//   ✓ reviewBundlerNode gets fully accumulated state
//   ✓ Inngest still handles fire-and-forget + timeout safety

export const processSessionFunction = inngest.createFunction(
  {
    id: 'process-ehr-session',
    retries: 0,
    triggers: [{ event: 'session/process.requested' }],
  },
  async ({ event, step }) => {
    const { sessionId, input } = event.data as { sessionId: string; input: SessionInput };

    await step.run('run-ehr-graph', async () => {
      let finalState: GraphState | null = null;

      // streamEvents gives per-node lifecycle events while the graph runs.
      // on_chain_start fires when each node begins → update Redis progress.
      // on_chain_end for the root 'LangGraph' fires at the very end → capture final state.
      const eventStream = ehrGraph.streamEvents(
        { input },
        { version: 'v2' },
      );

      for await (const evt of eventStream) {
        // ── Progress updates ────────────────────────────────────────────────
        if (evt.event === 'on_chain_start') {
          const progress = NODE_PROGRESS[evt.name];
          if (progress) {
            await setSessionStatus(sessionId, {
              status: 'processing',
              ...progress,
            });
          }
        }

        // ── Capture final state when the full graph completes ───────────────
        if (evt.event === 'on_chain_end' && evt.name === 'LangGraph') {
          finalState = evt.data.output as GraphState;
        }
      }

      if (!finalState) {
        await setSessionStatus(sessionId, {
          status: 'error',
          currentNode: 'unknown',
          percentComplete: 0,
          error: 'GRAPH_ERROR: No final state returned from ehrGraph',
        });
        return { status: 'error' };
      }

      // ── Quality / error gate ────────────────────────────────────────────
      if (finalState.error) {
        await setSessionStatus(sessionId, {
          status: 'error',
          currentNode: 'transcriptQualityNode',
          percentComplete: 15,
          error: finalState.error,
        });
        return { status: 'error', error: finalState.error };
      }

      // ── Persist results ─────────────────────────────────────────────────
      await Promise.all([
        setSessionStatus(sessionId, {
          status: 'complete',
          currentNode: 'reviewBundlerNode',
          percentComplete: 100,
        }),
        setReviewPackage(sessionId, finalState.reviewPackage!),
        setSessionInput(sessionId, input),
      ]);

      return { status: 'complete' };
    });

    return { status: 'complete', sessionId };
  },
);
