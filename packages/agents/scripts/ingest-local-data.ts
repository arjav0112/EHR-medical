/**
 * ingest-local-data.ts
 * Seeds the vector store from local processed JSON datasets.
 *
 * Auto-detects backend:
 *   - Upstash Vector  → when UPSTASH_VECTOR_REST_URL + UPSTASH_VECTOR_REST_TOKEN are set
 *   - ChromaDB        → when CHROMA_URL is set (requires chroma server running)
 *
 * Run: pnpm --filter agents ingest:local
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

import { Document } from '@langchain/core/documents';
import { getEmbeddings } from '../src/embeddings.js';
import { detectBackend } from '../src/vectorstore.js';

const PROCESSED = path.join(__dirname, '../data/processed');

// ─── Local JSON types ─────────────────────────────────────────────────────────

interface GuidelineEntry {
  id: string; source: string; domain: string;
  diagnosis: string; icd10?: string; content: string; tags: string[];
}
interface DSM5Entry {
  id: string; domain: string; code: string;
  disorder: string; content: string; specifiers?: string[]; tags: string[];
}
interface TherapyEntry {
  id: string; domain: string; modality: string; content: string; tags: string[];
}

function readJSON<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(PROCESSED, filename), 'utf-8')) as T;
}

// ─── Backend-aware ingest ─────────────────────────────────────────────────────

async function ingestUpstash(name: string, docs: Document[], embeddings: ReturnType<typeof getEmbeddings>) {
  const { UpstashVectorStore } = await import('@langchain/community/vectorstores/upstash');
  const { Index } = await import('@upstash/vector');

  const index = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
  });

  console.log(`   📡 Upstash namespace: "${name}" — uploading ${docs.length} docs...`);
  // Upstash upserts in batches automatically
  await UpstashVectorStore.fromDocuments(docs, embeddings, {
    index,
    namespace: name,
  });
  console.log(`   ✅ "${name}" — done`);
}

async function ingestChroma(name: string, docs: Document[], embeddings: ReturnType<typeof getEmbeddings>) {
  const { Chroma } = await import('@langchain/community/vectorstores/chroma');
  const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';
  console.log(`   🗄️  ChromaDB collection: "${name}" — uploading ${docs.length} docs to ${chromaUrl}...`);
  await Chroma.fromDocuments(docs, embeddings, {
    collectionName: name,
    url: chromaUrl,
  });
  console.log(`   ✅ "${name}" — done`);
}

async function ingestCollection(name: string, docs: Document[], embeddings: ReturnType<typeof getEmbeddings>) {
  console.log(`\n📥 Ingesting "${name}" — ${docs.length} documents`);
  const backend = detectBackend();
  if (backend === 'upstash') {
    await ingestUpstash(name, docs, embeddings);
  } else if (backend === 'chroma') {
    await ingestChroma(name, docs, embeddings);
  } else {
    throw new Error(
      'No vector backend configured.\n' +
      '  For Upstash: set UPSTASH_VECTOR_REST_URL + UPSTASH_VECTOR_REST_TOKEN\n' +
      '  For ChromaDB: set CHROMA_URL and run: chroma run --path ./packages/agents/data/chroma_db'
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📚 EHR Copilot — Local Dataset → Vector Store Ingestion\n');
  const backend = detectBackend();
  console.log(`  Backend  : ${backend.toUpperCase()}`);
  if (backend === 'upstash') {
    console.log(`  Index URL: ${process.env.UPSTASH_VECTOR_REST_URL}`);
  } else if (backend === 'chroma') {
    console.log(`  Chroma   : ${process.env.CHROMA_URL ?? 'http://localhost:8000'}`);
  }
  console.log();

  const embeddings = getEmbeddings();

  // ── 1. clinical_guidelines + therapy_protocols → clinical_guidelines ─────────
  const guidelines = readJSON<GuidelineEntry[]>('clinical_guidelines.json');
  const therapies  = readJSON<TherapyEntry[]>('therapy_protocols.json');

  const guidelineDocs: Document[] = [
    ...guidelines.map((g) => new Document({
      pageContent: `${g.diagnosis} — ${g.source}\n\n${g.content}`,
      metadata: {
        id: g.id, source: g.source, diagnosis: g.diagnosis,
        icd10: g.icd10 ?? '', tags: g.tags.join(','), collection: 'clinical_guidelines',
      },
    })),
    ...therapies.map((t) => new Document({
      pageContent: `Psychotherapy — ${t.modality}\n\n${t.content}`,
      metadata: {
        id: t.id, source: `Therapy Protocol: ${t.modality}`,
        modality: t.modality, tags: t.tags.join(','), collection: 'clinical_guidelines',
      },
    })),
  ];

  await ingestCollection('clinical_guidelines', guidelineDocs, embeddings);

  // ── 2. dsm5_criteria.json → dsm5_criteria ────────────────────────────────────
  const dsm5 = readJSON<DSM5Entry[]>('dsm5_criteria.json');
  const dsm5Docs: Document[] = dsm5.map((d) => new Document({
    pageContent: `${d.disorder} (${d.code})\n\n${d.content}${d.specifiers ? `\n\nSpecifiers: ${d.specifiers.join('; ')}` : ''}`,
    metadata: {
      id: d.id, code: d.code, disorder: d.disorder,
      tags: d.tags.join(','), collection: 'dsm5_criteria',
    },
  }));

  await ingestCollection('dsm5_criteria', dsm5Docs, embeddings);

  // ── Summary ───────────────────────────────────────────────────────────────────
  const total = guidelineDocs.length + dsm5Docs.length;
  console.log(`\n✅ Ingestion complete — ${total} total documents`);
  console.log(`   clinical_guidelines : ${guidelineDocs.length} docs`);
  console.log(`   dsm5_criteria       : ${dsm5Docs.length} docs`);
  console.log('\n   Run pnpm check to verify.\n');
}

main().catch((err) => {
  console.error('\n❌ Ingestion failed:', err);
  process.exit(1);
});
