import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { getEmbeddings } from '../embeddings';

// Per-patient store cache — keyed by patient ID
// Uses a separate Chroma collection per patient so notes don't bleed between patients
const storeCache = new Map<string, Chroma>();

/**
 * Sanitises a patient ID for use as a ChromaDB collection name.
 * Chroma collection names must be [a-zA-Z0-9_-], 3-63 chars.
 */
function toCollectionName(patientId: string): string {
  const sanitised = patientId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 55);
  return `patient_${sanitised}_notes`;
}

/**
 * Indexes a patient's prior SOAP notes into a patient-specific Chroma collection.
 * Call this once at session start when prior notes are available.
 * Safe to call multiple times — overwrites the existing collection for this patient.
 *
 * @param patientId   Anonymised patient identifier
 * @param priorNotes  Array of prior session SOAP text + session number
 */
export async function indexPriorNotes(
  patientId: string,
  priorNotes: Array<{ session: number; soapNote: string }>
): Promise<void> {
  if (!priorNotes.length) return;

  const embeddings = getEmbeddings();
  const collectionName = toCollectionName(patientId);
  const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';

  const docs = priorNotes.map(
    (n) =>
      new Document({
        pageContent: n.soapNote,
        metadata: {
          session_number: n.session,
          patient_id: patientId,
          source: `session_${n.session}`,
        },
      })
  );

  const store = await Chroma.fromDocuments(docs, embeddings, {
    collectionName,
    url: chromaUrl,
    collectionMetadata: { 'hnsw:space': 'cosine' },
  });

  storeCache.set(patientId, store);
}

/**
 * Tool 10 — Prior Session Notes Search
 * Semantic search over a patient's indexed prior SOAP notes.
 * Used to surface longitudinal clinical history relevant to the current session.
 *
 * Must call indexPriorNotes() before using this tool for a new patient.
 */
export const priorNotesSearchTool = tool(
  async ({ patient_id, query, top_k = 3 }) => {
    const patientStore = storeCache.get(patient_id);

    if (!patientStore) {
      return JSON.stringify({
        passages: [],
        message:
          'No prior notes indexed for this patient — either first session or indexPriorNotes() not called.',
        action: 'Call indexPriorNotes(patientId, priorNotes) before using this tool.',
      });
    }

    try {
      const results = await patientStore.similaritySearchWithScore(query, top_k);
      const passages = results.map(([doc, score]) => ({
        session_number: doc.metadata?.session_number as number | undefined,
        text: doc.pageContent.slice(0, 500),
        score: Math.round(score * 100) / 100,
      }));

      return JSON.stringify({ passages, patient_id, query });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({
        passages: [],
        error: 'Prior notes search failed',
        message: msg,
      });
    }
  },
  {
    name: 'prior_notes_search',
    description:
      "Search this patient's indexed prior session SOAP notes for relevant clinical history. Use when generating Subjective (mood trajectory), Assessment (prior diagnoses), and Plan (prior goals and treatment response). Requires prior notes to be indexed via indexPriorNotes().",
    schema: z.object({
      patient_id: z
        .string()
        .describe('Anonymised patient identifier — same ID used in indexPriorNotes()'),
      query: z
        .string()
        .describe(
          "What to search for e.g. 'sleep problems', 'medication side effects', 'treatment goals'"
        ),
      top_k: z
        .number()
        .optional()
        .describe('Number of passages to return, default 3'),
    }),
  }
);
