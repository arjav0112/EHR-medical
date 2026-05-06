import fs from 'fs';
import path from 'path';

// ─── Path resolution ──────────────────────────────────────────────────────────
// __dirname = packages/agents/src/data/  →  go up 3 levels to packages/agents/
// then into data/processed/

function resolveData(filename: string): string {
  // __dirname = packages/agents/src/data/
  // 2 x '..' → packages/agents/
  // then /data/processed/<filename>
  return path.join(__dirname, '..', '..', 'data', 'processed', filename);
}

// ─── Generic lazy loader with in-process cache ────────────────────────────────

const cache = new Map<string, unknown>();

function loadJSON<T>(filename: string): T {
  if (cache.has(filename)) return cache.get(filename) as T;
  const fullPath = resolveData(filename);
  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(raw) as T;
    cache.set(filename, data);
    return data;
  } catch (err) {
    console.error(`[data] Failed to load ${fullPath}:`, err);
    throw new Error(`[data] Could not load ${filename} — run 'pnpm ingest' if this is the first run.`);
  }
}

// ─── Types (mirrors the processed JSON shapes) ────────────────────────────────

export interface DSM5Entry {
  id: string;
  domain: string;
  code: string;           // ICD-10 code(s) e.g. "F32/F33" or "F41.1"
  disorder: string;
  content: string;
  specifiers?: string[];
  exclusions?: string[];
  tags: string[];
}

export interface ICD10Entry {
  id: string;
  code: string;
  description: string;
  domain: string;
  content: string;
  tags: string[];
}

export interface DrugEntry {
  id: string;
  domain: string;
  generic: string;
  brand: string;
  class: string;
  indications: string[];
  content: string;
  tags: string[];
}

export interface TherapyEntry {
  id: string;
  domain: string;
  modality: string;
  content: string;
  tags: string[];
}

export interface RiskScales {
  scales: {
    c_ssrs: RiskScale;
    phq9: RiskScale;
    gad7: RiskScale;
    pcl5: RiskScale;
    [key: string]: RiskScale;
  };
}

export interface RiskScale {
  name: string;
  acronym: string;
  purpose: string;
  questions: Array<{ id: number; question: string; [k: string]: unknown }>;
  severity_mapping: Record<string, { range?: string; action: string; description?: string }>;
  [key: string]: unknown;
}

// ─── Public loaders ───────────────────────────────────────────────────────────

/** All DSM-5 criteria entries */
export function loadDSM5Criteria(): DSM5Entry[] {
  return loadJSON<DSM5Entry[]>('dsm5_criteria.json');
}

/** ICD-10-CM psychiatric codes index */
export function loadICD10Index(): ICD10Entry[] {
  return loadJSON<ICD10Entry[]>('icd10_codes.json');
}

/** Drug labels for psychiatric medications */
export function loadDrugLabels(): DrugEntry[] {
  return loadJSON<DrugEntry[]>('drug_labels.json');
}

/** Psychotherapy protocol summaries */
export function loadTherapyProtocols(): TherapyEntry[] {
  return loadJSON<TherapyEntry[]>('therapy_protocols.json');
}

/** Clinical assessment scales (C-SSRS, PHQ-9, GAD-7, PCL-5) */
export function loadRiskScales(): RiskScales {
  return loadJSON<RiskScales>('risk_scales.json');
}

// ─── Helper queries ───────────────────────────────────────────────────────────

/**
 * Get the short label for an ICD-10 code.
 * Returns undefined if the code is not in the local index.
 */
export function getICD10Label(code: string): string | undefined {
  const index = loadICD10Index();
  const entry = index.find(
    (e) => e.code.toLowerCase() === code.toLowerCase()
  );
  return entry?.description;
}

/**
 * Look up a medication by generic or brand name (case-insensitive).
 * Searches drug_labels.json local dataset.
 * Returns the entry or undefined if not found.
 */
export function getMedicationInfo(name: string): DrugEntry | undefined {
  const labels = loadDrugLabels();
  const q = name.toLowerCase().trim();
  return labels.find(
    (d) =>
      d.generic.toLowerCase().includes(q) ||
      d.brand.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
  );
}
