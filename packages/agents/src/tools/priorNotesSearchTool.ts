import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// ─── In-memory store (primary) ─────────────────────────────────────────────────
// Keyed by patient ID. Always available; no network dependency.
interface NoteEntry {
  session: number;
  soapNote: string;
}
const memoryStore = new Map<string, NoteEntry[]>();

// ─── ChromaDB store cache (optional enhancement) ───────────────────────────────
let chromaAvailable: boolean | null = null; // null = not yet tested

async function isChromaAvailable(): Promise<boolean> {
  if (chromaAvailable !== null) return chromaAvailable;
  const chromaUrl = process.env.CHROMA_URL;
  if (!chromaUrl) {
    chromaAvailable = false;
    return false;
  }
  try {
    const r = await fetch(`${chromaUrl}/api/v2/heartbeat`, {
      signal: AbortSignal.timeout(2000),
    });
    chromaAvailable = r.ok;
  } catch {
    chromaAvailable = false;
  }
  return chromaAvailable;
}

// ─── Keyword scoring for in-memory fallback ────────────────────────────────────
function scoreNote(note: NoteEntry, terms: string[]): number {
  const haystack = note.soapNote.toLowerCase();
  const hits = terms.filter((t) => haystack.includes(t)).length;
  return hits / terms.length;
}

function keywordSearchNotes(
  notes: NoteEntry[],
  query: string,
  topK: number
): Array<{ session_number: number; text: string; score: number }> {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (!terms.length) return [];

  return notes
    .map((note) => ({ note, score: scoreNote(note, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ note, score }) => ({
      session_number: note.session,
      text: note.soapNote.slice(0, 500),
      score: Math.round(score * 100) / 100,
    }));
}

/**
 * Indexes a patient's prior SOAP notes.
 *
 * Primary:  Stored in-process memory (always available, no network).
 * Enhanced: Also indexes into ChromaDB patient-specific collection when available.
 *
 * Call once at session start when prior notes are provided.
 */
export async function indexPriorNotes(
  patientId: string,
  priorNotes: Array<{ session: number; soapNote: string }>
): Promise<void> {
  if (!priorNotes.length) return;

  // Always write to in-memory store
  memoryStore.set(patientId, priorNotes);

  // Optionally enhance with ChromaDB (best-effort, never throws)
  if (await isChromaAvailable()) {
    try {
      const { Chroma } = await import('@langchain/community/vectorstores/chroma');
      const { Document } = await import('@langchain/core/documents');
      const { getEmbeddings } = await import('../embeddings');

      const sanitised = patientId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 55);
      const collectionName = `patient_${sanitised}_notes`;
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

      await Chroma.fromDocuments(docs, getEmbeddings(), {
        collectionName,
        url: chromaUrl,
        collectionMetadata: { 'hnsw:space': 'cosine' },
      });
    } catch {
      // ChromaDB enhancement failed — memory store still works fine
    }
  }
}

/**
 * Tool — Prior Session Notes Search
 *
 * Searches a patient's prior SOAP notes for relevant clinical history.
 * Uses in-memory keyword search (always works) with ChromaDB semantic
 * enhancement when available.
 */
export const priorNotesSearchTool = tool(
  async ({ patient_id, query, top_k = 3 }) => {
    const notes = memoryStore.get(patient_id);

    if (!notes?.length) {
      return JSON.stringify({
        passages: [],
        message: 'No prior notes available for this patient (first session or not yet provided).',
        action:
          'If prior notes exist, call indexPriorNotes(patientId, priorNotes) before the session graph runs.',
      });
    }

    // Try ChromaDB semantic search first (best-effort)
    if (await isChromaAvailable()) {
      try {
        const { Chroma } = await import('@langchain/community/vectorstores/chroma');
        const { getEmbeddings } = await import('../embeddings');
        const sanitised = patient_id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 55);
        const collectionName = `patient_${sanitised}_notes`;
        const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';

        const store = await Chroma.fromExistingCollection(getEmbeddings(), {
          collectionName,
          url: chromaUrl,
        });
        const results = await store.similaritySearchWithScore(query, top_k);
        const passages = results.map(([doc, score]) => ({
          session_number: doc.metadata?.session_number as number | undefined,
          text: doc.pageContent.slice(0, 500),
          score: Math.round(score * 100) / 100,
          retrieval: 'semantic',
        }));
        if (passages.length) return JSON.stringify({ passages, patient_id, query });
      } catch {
        // fall through to keyword
      }
    }

    // Keyword fallback over in-memory notes
    const passages = keywordSearchNotes(notes, query, top_k).map((p) => ({
      ...p,
      retrieval: 'keyword',
    }));

    if (passages.length) {
      return JSON.stringify({ passages, patient_id, query });
    }

    return JSON.stringify({
      passages: [],
      message: 'No matching passages found in prior notes for this query.',
    });
  },
  {
    name: 'prior_notes_search',
    description:
      "Search this patient's prior session SOAP notes for relevant clinical history (mood trajectory, prior diagnoses, treatment response, goals). Uses semantic search when available, keyword search otherwise. Returns empty passages for first-session patients.",
    schema: z.object({
      patient_id: z
        .string()
        .describe('Anonymised patient identifier — same ID used in indexPriorNotes()'),
      query: z
        .string()
        .describe(
          "What to search for e.g. 'sleep problems', 'medication side effects', 'treatment goals'"
        ),
      top_k: z.number().optional().describe('Number of passages to return, default 3'),
    }),
  }
);
