import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getVectorStore, COLLECTIONS } from '../vectorstore';
import type { Chroma } from '@langchain/community/vectorstores/chroma';

// Lazy singleton — initialised on first call, reused across all tool invocations
let store: Chroma | null = null;
let storeInitialised = false;

async function getGuidelinesStore(): Promise<Chroma | null> {
  if (storeInitialised) return store;
  storeInitialised = true;
  try {
    store = await getVectorStore(COLLECTIONS.CLINICAL_GUIDELINES);
    return store;
  } catch {
    // ChromaDB not running / collection not yet populated
    store = null;
    return null;
  }
}

/**
 * Tool 9 — Clinical Guidelines RAG
 * Performs semantic search over the clinical_guidelines ChromaDB collection.
 * Reuses the shared getVectorStore() + COLLECTIONS infrastructure from
 * vectorstore.ts — no duplicate Chroma initialisation.
 *
 * Degrades gracefully when the collection is not yet populated (pre-ingest).
 */
export const guidelinesRAGTool = tool(
  async ({ query, top_k = 4 }) => {
    const guidelinesStore = await getGuidelinesStore();

    if (!guidelinesStore) {
      return JSON.stringify({
        chunks: [],
        message: 'Clinical guidelines vector store not yet populated.',
        action: "Run 'pnpm ingest:guidelines' to populate it.",
        fallback: 'Use evidence-based clinical knowledge for this query.',
      });
    }

    try {
      const results = await guidelinesStore.similaritySearchWithScore(query, top_k);
      const chunks = results.map(([doc, score]) => ({
        text: doc.pageContent.slice(0, 600),
        source: (doc.metadata?.source as string | undefined) ?? 'Clinical guideline',
        domain: (doc.metadata?.domain as string | undefined) ?? 'clinical_guidelines',
        score: Math.round(score * 100) / 100,
      }));
      return JSON.stringify({ chunks, query, total: chunks.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({
        chunks: [],
        error: 'Vector search failed',
        message: msg,
        fallback: 'Use general clinical knowledge.',
      });
    }
  },
  {
    name: 'clinical_guidelines_search',
    description:
      'Semantic search over APA, WHO mhGAP, and VA/DoD clinical guidelines for evidence-based treatment recommendations. Use when suggesting diagnoses or interventions. Falls back gracefully if vector store not yet populated.',
    schema: z.object({
      query: z
        .string()
        .describe(
          "Clinical question e.g. 'first-line pharmacotherapy for MDD' or 'suicide risk assessment steps'"
        ),
      top_k: z
        .number()
        .optional()
        .describe('Number of guideline chunks to return, default 4'),
    }),
  }
);
