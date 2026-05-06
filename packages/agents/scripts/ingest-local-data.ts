/**
 * ingest-local-data.ts
 * Seeds ChromaDB from the local processed JSON datasets.
 * No PDFs required — runs immediately.
 * Run: pnpm --filter agents ingest:local
 *
 * Ingests:
 *   clinical_guidelines.json  → collection: clinical_guidelines
 *   dsm5_criteria.json        → collection: dsm5_criteria
 *   therapy_protocols.json    → collection: clinical_guidelines (merged)
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { getEmbeddings } from '../src/embeddings.js';

const PROCESSED = path.join(__dirname, '../data/processed');
const CHROMA_URL = process.env.CHROMA_URL ?? 'http://localhost:8000';
const PERSIST_DIR =
  process.env.CHROMA_PERSIST_DIR ?? path.join(__dirname, '../data/chroma_db');

interface GuidelineEntry {
  id: string;
  source: string;
  domain: string;
  diagnosis: string;
  icd10?: string;
  content: string;
  tags: string[];
}
interface DSM5Entry {
  id: string;
  domain: string;
  code: string;
  disorder: string;
  content: string;
  specifiers?: string[];
  tags: string[];
}
interface TherapyEntry {
  id: string;
  domain: string;
  modality: string;
  content: string;
  tags: string[];
}

function readJSON<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(PROCESSED, filename), 'utf-8')) as T;
}

async function ingestCollection(
  name: string,
  docs: Document[],
  embeddings: ReturnType<typeof getEmbeddings>,
) {
  console.log(`\n📥 Ingesting "${name}" — ${docs.length} documents...`);
  await Chroma.fromDocuments(docs, embeddings, {
    collectionName: name,
    url: CHROMA_URL,
  });
  console.log(`   ✅ "${name}" — done`);
}

async function main() {
  console.log('\n📚 EHR Copilot — Local Dataset → ChromaDB Ingestion\n');
  console.log(`  CHROMA URL : ${CHROMA_URL}`);
  console.log(`  PERSIST    : ${PERSIST_DIR}\n`);

  const embeddings = getEmbeddings();

  // ── 1. clinical_guidelines.json + therapy_protocols.json → clinical_guidelines ──
  const guidelines = readJSON<GuidelineEntry[]>('clinical_guidelines.json');
  const therapies  = readJSON<TherapyEntry[]>('therapy_protocols.json');

  const guidelineDocs: Document[] = [
    ...guidelines.map(
      (g) =>
        new Document({
          pageContent: `${g.diagnosis} — ${g.source}\n\n${g.content}`,
          metadata: {
            id: g.id,
            source: g.source,
            diagnosis: g.diagnosis,
            icd10: g.icd10 ?? '',
            tags: g.tags.join(','),
            collection: 'clinical_guidelines',
          },
        }),
    ),
    ...therapies.map(
      (t) =>
        new Document({
          pageContent: `Psychotherapy — ${t.modality}\n\n${t.content}`,
          metadata: {
            id: t.id,
            source: `Therapy Protocol: ${t.modality}`,
            modality: t.modality,
            tags: t.tags.join(','),
            collection: 'clinical_guidelines',
          },
        }),
    ),
  ];

  await ingestCollection('clinical_guidelines', guidelineDocs, embeddings);

  // ── 2. dsm5_criteria.json → dsm5_criteria ───────────────────────────────────
  const dsm5 = readJSON<DSM5Entry[]>('dsm5_criteria.json');
  const dsm5Docs: Document[] = dsm5.map(
    (d) =>
      new Document({
        pageContent: `${d.disorder} (${d.code})\n\n${d.content}${
          d.specifiers ? `\n\nSpecifiers: ${d.specifiers.join('; ')}` : ''
        }`,
        metadata: {
          id: d.id,
          code: d.code,
          disorder: d.disorder,
          tags: d.tags.join(','),
          collection: 'dsm5_criteria',
        },
      }),
  );

  await ingestCollection('dsm5_criteria', dsm5Docs, embeddings);

  // ── Summary ─────────────────────────────────────────────────────────────────
  const total = guidelineDocs.length + dsm5Docs.length;
  console.log('\n✅ All local datasets ingested into ChromaDB');
  console.log(`   ${total} total documents across 2 collections`);
  console.log(`   clinical_guidelines : ${guidelineDocs.length} docs`);
  console.log(`   dsm5_criteria       : ${dsm5Docs.length} docs`);
  console.log('\n   Run pnpm check to verify RAG is live.\n');
}

main().catch((err) => {
  console.error('\n❌ Ingestion failed:', err);
  process.exit(1);
});
