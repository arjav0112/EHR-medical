/**
 * setup.ts — EHR Copilot Tool Layer Health Check
 * Run: pnpm --filter agents check
 *
 * Verifies:
 *   Required and optional env vars
 *   All 4 local JSON datasets load correctly
 *   ChromaDB guidelines vector store is populated
 *   RxNorm API reachable (no key required)
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// scripts/ → packages/agents/ → packages/ → workspace root (.env)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

// Imports after dotenv so env is set before any lazy loaders run
import {
  loadICD10Index,
  loadDSM5Criteria,
  loadRiskScales,
  loadDrugLabels,
} from '../src/data/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckResult {
  check: string;
  status: '✅' | '❌' | '⚠️ ';
  note: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pass(check: string, note: string): CheckResult {
  return { check, status: '✅', note };
}
function fail(check: string, note: string): CheckResult {
  return { check, status: '❌', note };
}
function warn(check: string, note: string): CheckResult {
  return { check, status: '⚠️ ', note };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runSetup() {
  console.log('\n🔍 EHR Copilot — Tool Layer Health Check\n');
  const results: CheckResult[] = [];

  // ── 1. Environment variables ────────────────────────────────────────────────
  const REQUIRED_ENV = ['GOOGLE_API_KEY', 'VOYAGE_API_KEY'];
  const OPTIONAL_ENV = [
    'NCBI_API_KEY',
    'OPENFDA_API_KEY',
    'LANGCHAIN_API_KEY',
    'CHROMA_URL',
    'CHROMA_PERSIST_DIR',
  ];

  for (const key of REQUIRED_ENV) {
    results.push(
      process.env[key]
        ? pass(key, 'Set')
        : fail(key, 'REQUIRED — system will not function'),
    );
  }
  for (const key of OPTIONAL_ENV) {
    results.push(
      process.env[key]
        ? pass(key, 'Set')
        : warn(key, 'Optional — feature degraded without it'),
    );
  }

  // ── 2. Local JSON datasets ──────────────────────────────────────────────────
  const datasetChecks: [string, () => unknown][] = [
    ['ICD-10 dataset', () => loadICD10Index()],
    ['DSM-5 dataset', () => loadDSM5Criteria()],
    ['Risk scales dataset', () => loadRiskScales()],
    ['Drug labels dataset', () => loadDrugLabels()],
  ];

  for (const [label, loader] of datasetChecks) {
    try {
      const data = loader();
      const count = Array.isArray(data)
        ? data.length
        : Object.keys(data as object).length;
      results.push(pass(label, `Loaded (${count} entries)`));
    } catch (e) {
      results.push(fail(label, String(e)));
    }
  }

  // ── 3. ChromaDB — direct HTTP count (no embeddings key required) ───────────
  try {
    const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';
    const heartbeat = await fetch(`${chromaUrl}/api/v2/heartbeat`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!heartbeat.ok) throw new Error(`ChromaDB heartbeat ${heartbeat.status}`);

    const colRes = await fetch(
      `${chromaUrl}/api/v2/tenants/default_tenant/databases/default_database/collections/clinical_guidelines`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!colRes.ok) {
      results.push(warn('Guidelines RAG (ChromaDB)', 'Collection not found — run pnpm ingest:local'));
    } else {
      const col = (await colRes.json()) as { id?: string; name?: string };
      const colId = col.id;
      const countRes = await fetch(
        `${chromaUrl}/api/v2/tenants/default_tenant/databases/default_database/collections/${colId}/count`,
        { signal: AbortSignal.timeout(4000) },
      );
      const count = (await countRes.json()) as number;
      if (count > 0) {
        results.push(pass('Guidelines RAG (ChromaDB)', `${count} documents indexed`));
      } else {
        results.push(warn('Guidelines RAG (ChromaDB)', 'Collection empty — run pnpm ingest:local'));
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isConnRefused = msg.includes('ECONNREFUSED') || msg.includes('fetch failed');
    results.push(
      warn(
        'Guidelines RAG (ChromaDB)',
        isConnRefused
          ? 'Not running — start with: chroma run --path ./packages/agents/data/chroma_db'
          : `Error: ${msg}`,
      ),
    );
  }


  // ── 4. RxNorm API (no key required) ────────────────────────────────────────
  try {
    const res = await fetch('https://rxnav.nlm.nih.gov/REST/rxcui.json?name=sertraline', {
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { idGroup?: { rxnormId?: string[] } };
    const rxcui = data.idGroup?.rxnormId?.[0];
    results.push(
      rxcui
        ? pass('RxNorm API', `Reachable — sertraline RXCUI: ${rxcui}`)
        : warn('RxNorm API', 'Reachable but no result returned'),
    );
  } catch {
    results.push(fail('RxNorm API', 'Unreachable — check internet connectivity'));
  }

  // ── 5. NCBI PubMed (optional) ──────────────────────────────────────────────
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=depression&retmax=1&retmode=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as { esearchresult?: { count?: string } };
    results.push(
      data.esearchresult?.count
        ? pass('PubMed API (NCBI)', `Reachable — ${data.esearchresult.count} depression articles`)
        : warn('PubMed API (NCBI)', 'Reachable but unexpected response'),
    );
  } catch {
    results.push(warn('PubMed API (NCBI)', 'Unreachable or rate-limited'));
  }

  // ── Print table ─────────────────────────────────────────────────────────────
  const COL_W = 32;
  console.log('Check'.padEnd(COL_W) + 'Status   Note');
  console.log('─'.repeat(72));
  for (const r of results) {
    console.log(r.check.padEnd(COL_W) + r.status + '   ' + r.note);
  }

  const failed = results.filter((r) => r.status === '❌').length;
  const warned = results.filter((r) => r.status === '⚠️ ').length;
  const passed = results.length - failed - warned;
  const overall = failed === 0 ? '✅' : '❌';

  console.log(`\n${overall} ${passed} passed · ${warned} warnings · ${failed} failed\n`);

  if (failed > 0) process.exit(1);
}

runSetup().catch((err) => {
  console.error('\n❌ Health check failed unexpectedly:', err);
  process.exit(1);
});
