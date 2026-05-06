/**
 * ingest-guidelines.ts
 * One-time script — embed clinical guideline PDFs into ChromaDB.
 * Run: pnpm --filter agents ingest:guidelines
 *
 * Requires tsconfig.scripts.json for IDE type checking.
 * Place PDFs in packages/agents/data/raw/guidelines/ before running.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// ESM-safe __dirname — must be before any env-dependent imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

// Env is now loaded — import env-reading modules after dotenv
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { getEmbeddings } from '../src/embeddings';

const RAW_DIR = path.join(__dirname, '../data/raw/guidelines');
const PERSIST_DIR =
  process.env.CHROMA_PERSIST_DIR ?? path.join(__dirname, '../data/chroma_db');
const CHROMA_URL = process.env.CHROMA_URL ?? 'http://localhost:8000';

// ─── Guideline sources ────────────────────────────────────────────────────────
// Place these PDFs in data/raw/guidelines/ — download links in README.

const GUIDELINE_FILES = [
  { file: 'apa_mdd.pdf',           source: 'APA Practice Guideline — MDD (2010)' },
  { file: 'apa_depression.pdf',    source: 'APA Guideline — Treatment of Depression (2021)' },
  { file: 'who_mhgap.pdf',         source: 'WHO mhGAP Guideline (2023)' },
  { file: 'va_dod_mdd_2022.pdf',   source: 'VA/DoD MDD Clinical Practice Guideline (2022)' },
  { file: 'va_dod_suicide_2024.pdf', source: 'VA/DoD Suicide Risk Assessment Guideline (2024)' },
];

// ─── Chunking ─────────────────────────────────────────────────────────────────

function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
    i += chunkSize - overlap;
  }
  return chunks;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function ingestGuidelines() {
  console.log('\n📚 EHR Copilot — Guidelines Ingestion\n');
  console.log(`  RAW_DIR  : ${RAW_DIR}`);
  console.log(`  CHROMA   : ${CHROMA_URL}`);
  console.log(`  PERSIST  : ${PERSIST_DIR}\n`);

  // Ensure raw dir exists
  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
    console.log(`📁 Created ${RAW_DIR}`);
  }

  const embeddings = getEmbeddings();
  const allDocs: Document[] = [];
  let skipped = 0;
  let failed = 0;

  for (const { file, source } of GUIDELINE_FILES) {
    const filePath = path.join(RAW_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Skipping ${file} — not found`);
      console.warn(`   Place it in: ${RAW_DIR}`);
      skipped++;
      continue;
    }

    try {
      console.log(`📖 Parsing ${file}...`);
      const buffer = fs.readFileSync(filePath);
      const { text } = await pdfParse(buffer);
      const chunks = chunkText(text);
      const docs = chunks.map(
        (chunk, i) =>
          new Document({
            pageContent: chunk,
            metadata: { source, file, chunk_index: i },
          }),
      );
      allDocs.push(...docs);
      console.log(`   ✅ ${docs.length} chunks — ${source}`);
    } catch (err) {
      console.error(`   ❌ Failed to parse ${file}:`, err);
      failed++;
    }
  }

  if (!allDocs.length) {
    console.log('\n⚠️  No guideline files found — vector store not created.');
    console.log('   Agents will use Gemini Flash knowledge as fallback.');
    console.log('   See README §"Tool Layer Setup" for download links.\n');
    return;
  }

  const embeddingMode = 'Voyage AI (voyage-2)';
  console.log(`\n🔢 Embedding ${allDocs.length} chunks via ${embeddingMode}...`);

  await Chroma.fromDocuments(allDocs, embeddings, {
    collectionName: 'clinical_guidelines',
    url: CHROMA_URL,
  });

  console.log('\n✅ Ingestion complete');
  console.log(`   ${allDocs.length} chunks embedded`);
  console.log(`   ${skipped}  files skipped (not found)`);
  console.log(`   ${failed}   files failed (parse error)`);
  console.log(`   Collection : clinical_guidelines`);
  console.log(`   Location   : ${PERSIST_DIR}\n`);
}

ingestGuidelines().catch((err) => {
  console.error('\n❌ Ingestion failed:', err);
  process.exit(1);
});
