import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { loadClinicalGuidelines, type GuidelineEntry } from '../data';

// ─── ChromaDB imports (optional — lazy, never throws at module load time) ──────
let chromaStore: import('@langchain/community/vectorstores/chroma').Chroma | null = null;
let chromaInitAttempted = false;

async function tryGetChromaStore() {
  if (chromaInitAttempted) return chromaStore;
  chromaInitAttempted = true;

  // Skip ChromaDB entirely if no URL is configured (Vercel, etc.)
  const chromaUrl = process.env.CHROMA_URL;
  if (!chromaUrl) return null;

  try {
    const { getVectorStore, COLLECTIONS } = await import('../vectorstore');
    chromaStore = await getVectorStore(COLLECTIONS.CLINICAL_GUIDELINES);
  } catch {
    chromaStore = null;
  }
  return chromaStore;
}

// ─── Keyword fallback — runs entirely on bundled JSON, no network ─────────────

/**
 * Score a guideline entry against a query using simple TF-like term overlap.
 * Returns a score in [0, 1].
 */
function scoreEntry(entry: GuidelineEntry, terms: string[]): number {
  const haystack = [
    entry.content,
    entry.diagnosis,
    entry.domain,
    entry.source,
    ...(entry.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();

  const hits = terms.filter((t) => haystack.includes(t)).length;
  return hits / terms.length;
}

function keywordSearch(
  query: string,
  topK: number
): Array<{ text: string; source: string; domain: string; score: number }> {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (!terms.length) return [];

  const guidelines = loadClinicalGuidelines();
  const scored = guidelines
    .map((entry) => ({ entry, score: scoreEntry(entry, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(({ entry, score }) => ({
    text: entry.content.slice(0, 600),
    source: entry.source,
    domain: entry.domain,
    score: Math.round(score * 100) / 100,
  }));
}

// ─── Tool definition ──────────────────────────────────────────────────────────

/**
 * Tool — Clinical Guidelines RAG
 *
 * Two-tier retrieval:
 *   1. ChromaDB semantic search (when CHROMA_URL is set and server is reachable)
 *   2. Keyword search over bundled clinical_guidelines.json (always available)
 *
 * Never errors in production — always returns guideline chunks or a clear message.
 */
export const guidelinesRAGTool = tool(
  async ({ query, top_k = 4 }) => {
    // Tier 1 — ChromaDB semantic search
    const store = await tryGetChromaStore();
    if (store) {
      try {
        const results = await store.similaritySearchWithScore(query, top_k);
        const chunks = results.map(([doc, score]) => ({
          text: doc.pageContent.slice(0, 600),
          source: (doc.metadata?.source as string | undefined) ?? 'Clinical guideline',
          domain: (doc.metadata?.domain as string | undefined) ?? 'clinical_guidelines',
          score: Math.round(score * 100) / 100,
          retrieval: 'semantic',
        }));
        if (chunks.length) {
          return JSON.stringify({ chunks, query, total: chunks.length });
        }
      } catch {
        // fall through to keyword search
      }
    }

    // Tier 2 — Keyword search over bundled JSON (no network required)
    const chunks = keywordSearch(query, top_k).map((c) => ({
      ...c,
      retrieval: 'keyword',
    }));

    if (chunks.length) {
      return JSON.stringify({ chunks, query, total: chunks.length });
    }

    // Tier 3 — Graceful empty (let the LLM use its own knowledge)
    return JSON.stringify({
      chunks: [],
      query,
      message: 'No matching guideline chunks found. Apply evidence-based clinical knowledge.',
    });
  },
  {
    name: 'clinical_guidelines_search',
    description:
      'Search APA, WHO mhGAP, and VA/DoD clinical guidelines for evidence-based recommendations. Uses semantic search (ChromaDB) when available, falls back to keyword search over bundled guideline data. Always returns results — use when suggesting diagnoses, risk protocols, or treatment plans.',
    schema: z.object({
      query: z
        .string()
        .describe(
          "Clinical question e.g. 'first-line pharmacotherapy for MDD' or 'suicide risk assessment protocol'"
        ),
      top_k: z
        .number()
        .optional()
        .describe('Number of guideline chunks to return, default 4'),
    }),
  }
);
