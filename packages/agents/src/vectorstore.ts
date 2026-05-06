import { Chroma } from '@langchain/community/vectorstores/chroma';
import { getEmbeddings } from './embeddings';

// ─── Collection Names ─────────────────────────────────────────────────────────
// Each collection holds a distinct clinical knowledge domain.
// Names are stable — ingestion scripts write to these, agents read from them.

export const COLLECTIONS = {
  /** WHO / APA clinical practice guidelines (depression, anxiety, PTSD, etc.) */
  CLINICAL_GUIDELINES: 'clinical_guidelines',
  /** DSM-5 diagnostic criteria, differential rules, specifiers */
  DSM5_CRITERIA: 'dsm5_criteria',
  /** FDA-approved psychiatric drug labels (from OpenFDA) */
  DRUG_LABELS: 'drug_labels',
  /** ICD-10-CM mental-health relevant codes + descriptions */
  ICD10_CODES: 'icd10_codes',
  /** Psychotherapy protocol summaries (CBT, DBT, ACT, MI, etc.) */
  THERAPY_PROTOCOLS: 'therapy_protocols',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

// ─── ChromaDB client base URL ─────────────────────────────────────────────────

function getChromaUrl(): string {
  return process.env.CHROMA_URL ?? 'http://localhost:8000';
}

// ─── Per-collection store factory ─────────────────────────────────────────────

/**
 * Returns a LangChain Chroma VectorStore for the given collection.
 * Uses the env-aware embeddings from getEmbeddings().
 *
 * @param collection  One of the COLLECTIONS constants
 * @param persist     Set false to use in-memory only (tests). Default: true
 */
export async function getVectorStore(
  collection: CollectionName,
  persist = true
): Promise<Chroma> {
  const embeddings = getEmbeddings();
  const store = new Chroma(embeddings, {
    collectionName: collection,
    url: getChromaUrl(),
    ...(persist
      ? { collectionMetadata: { 'hnsw:space': 'cosine' } }
      : {}),
  });
  return store;
}

// ─── Retriever factory ────────────────────────────────────────────────────────

/**
 * Returns a LangChain VectorStoreRetriever for the given collection.
 *
 * @param collection  One of the COLLECTIONS constants
 * @param k           Number of documents to retrieve (default: 4)
 */
export async function getRetriever(
  collection: CollectionName,
  k = 4
) {
  const store = await getVectorStore(collection);
  return store.asRetriever({ k });
}
