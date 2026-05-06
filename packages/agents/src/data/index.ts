// Static JSON imports — bundled at build time, no fs access needed in production.
// Works on Vercel serverless, Edge, and any environment where the filesystem is read-only.
import dsm5Raw from '../../data/processed/dsm5_criteria.json';
import icd10Raw from '../../data/processed/icd10_codes.json';
import drugLabelsRaw from '../../data/processed/drug_labels.json';
import therapyRaw from '../../data/processed/therapy_protocols.json';
import riskScalesRaw from '../../data/processed/risk_scales.json';
import guidelinesRaw from '../../data/processed/clinical_guidelines.json';


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

export interface GuidelineEntry {
  id: string;
  source: string;
  domain: string;
  diagnosis: string;
  icd10?: string;
  content: string;
  tags: string[];
}

// ─── Public loaders ───────────────────────────────────────────────────────────

/** All DSM-5 criteria entries */
export function loadDSM5Criteria(): DSM5Entry[] {
  return dsm5Raw as DSM5Entry[];
}

/** ICD-10-CM psychiatric codes index */
export function loadICD10Index(): ICD10Entry[] {
  return icd10Raw as ICD10Entry[];
}

/** Drug labels for psychiatric medications */
export function loadDrugLabels(): DrugEntry[] {
  return drugLabelsRaw as DrugEntry[];
}

/** Psychotherapy protocol summaries */
export function loadTherapyProtocols(): TherapyEntry[] {
  return therapyRaw as TherapyEntry[];
}

/** Clinical assessment scales (C-SSRS, PHQ-9, GAD-7, PCL-5) */
export function loadRiskScales(): RiskScales {
  return riskScalesRaw as unknown as RiskScales;
}

/** Clinical guidelines (APA, WHO mhGAP, VA/DoD) */
export function loadClinicalGuidelines(): GuidelineEntry[] {
  return guidelinesRaw as GuidelineEntry[];
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
