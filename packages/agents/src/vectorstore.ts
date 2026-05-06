/**
 * vectorstore.ts — Smart vector store factory
 *
 * Priority order:
 *   1. Upstash Vector  — when UPSTASH_VECTOR_REST_URL + UPSTASH_VECTOR_REST_TOKEN are set
 *                        → Pure HTTP, works on Vercel, Netlify, Edge, anywhere
 *   2. ChromaDB        — when CHROMA_URL is set (local dev / self-hosted)
 *   3. Keyword search  — bundled JSON fallback (always works, no vector DB needed)
 *
 * The guidelinesRAGTool and other tools consume this module and handle tier-3 fallback.
 */

import { getEmbeddings } from './embeddings';

// ─── Collection / Namespace names ─────────────────────────────────────────────

export const COLLECTIONS = {
  CLINICAL_GUIDELINES: 'clinical_guidelines',
  DSM5_CRITERIA: 'dsm5_criteria',
  DRUG_LABELS: 'drug_labels',
  ICD10_CODES: 'icd10_codes',
  THERAPY_PROTOCOLS: 'therapy_protocols',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

// ─── Backend detection ────────────────────────────────────────────────────────

export type VectorBackend = 'upstash' | 'chroma' | 'none';

/** Called at runtime so dotenv has already loaded env vars. */
export function detectBackend(): VectorBackend {
  if (
    process.env.UPSTASH_VECTOR_REST_URL &&
    process.env.UPSTASH_VECTOR_REST_TOKEN
  ) {
    return 'upstash';
  }
  if (process.env.CHROMA_URL) {
    return 'chroma';
  }
  return 'none';
}

// Convenience re-export — only use in code that runs AFTER dotenv.config()
export const VECTOR_BACKEND = detectBackend;

// ─── Upstash VectorStore factory ──────────────────────────────────────────────

/**
 * Returns an Upstash-backed LangChain VectorStore.
 * Upstash uses a single index with namespaces — each COLLECTION maps to a namespace.
 */
async function getUpstashStore(namespace: CollectionName) {
  const { UpstashVectorStore } = await import(
    '@langchain/community/vectorstores/upstash'
  );
  const { Index } = await import('@upstash/vector');

  const index = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
  });

  return new UpstashVectorStore(getEmbeddings(), {
    index,
    namespace,
  });
}

// ─── ChromaDB VectorStore factory (local dev) ─────────────────────────────────

async function getChromaStore(collection: CollectionName) {
  const { Chroma } = await import('@langchain/community/vectorstores/chroma');
  return new Chroma(getEmbeddings(), {
    collectionName: collection,
    url: process.env.CHROMA_URL ?? 'http://localhost:8000',
    collectionMetadata: { 'hnsw:space': 'cosine' },
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the appropriate VectorStore for the given collection.
 * Throws if no vector backend is configured (handle at call site).
 */
export async function getVectorStore(collection: CollectionName) {
  const backend = detectBackend();
  switch (backend) {
    case 'upstash':
      return getUpstashStore(collection);
    case 'chroma':
      return getChromaStore(collection);
    default:
      throw new Error(
        'No vector backend configured. Set UPSTASH_VECTOR_REST_URL + UPSTASH_VECTOR_REST_TOKEN (production) or CHROMA_URL (local dev).'
      );
  }
}

/**
 * Returns a LangChain VectorStoreRetriever for the given collection.
 */
export async function getRetriever(collection: CollectionName, k = 4) {
  const store = await getVectorStore(collection);
  return store.asRetriever({ k });
}
