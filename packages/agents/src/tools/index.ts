// ─── Individual tool exports ──────────────────────────────────────────────────

export { dsm5LookupTool } from './dsm5LookupTool';
export { icd10SearchTool } from './icd10SearchTool';
export { riskProtocolTool } from './riskProtocolTool';
export { transcriptCitationTool } from './transcriptCitationTool';
export { confidenceScorerTool } from './confidenceScorerTool';
export { pubmedSearchTool } from './pubmedSearchTool';
export { rxnormLookupTool } from './rxnormLookupTool';
export { drugInteractionTool } from './drugInteractionTool';
export { guidelinesRAGTool } from './guidelinesRAGTool';
export { priorNotesSearchTool, indexPriorNotes } from './priorNotesSearchTool';

// ─── Grouped collections for agent binding ────────────────────────────────────

import { dsm5LookupTool } from './dsm5LookupTool';
import { icd10SearchTool } from './icd10SearchTool';
import { riskProtocolTool } from './riskProtocolTool';
import { transcriptCitationTool } from './transcriptCitationTool';
import { confidenceScorerTool } from './confidenceScorerTool';
import { pubmedSearchTool } from './pubmedSearchTool';
import { rxnormLookupTool } from './rxnormLookupTool';
import { drugInteractionTool } from './drugInteractionTool';
import { guidelinesRAGTool } from './guidelinesRAGTool';
import { priorNotesSearchTool } from './priorNotesSearchTool';

/** All 10 tools — bind to any agent with model.bindTools(ALL_TOOLS) */
export const ALL_TOOLS = [
  dsm5LookupTool,
  icd10SearchTool,
  riskProtocolTool,
  transcriptCitationTool,
  confidenceScorerTool,
  pubmedSearchTool,
  rxnormLookupTool,
  drugInteractionTool,
  guidelinesRAGTool,
  priorNotesSearchTool,
] as const;

/** Clinical knowledge tools (no external APIs) — for offline/test environments */
export const LOCAL_TOOLS = [
  dsm5LookupTool,
  icd10SearchTool,
  riskProtocolTool,
  transcriptCitationTool,
  confidenceScorerTool,
  rxnormLookupTool,
] as const;

/** External API tools — require network access */
export const NETWORK_TOOLS = [
  pubmedSearchTool,
  drugInteractionTool,
  guidelinesRAGTool,
  priorNotesSearchTool,
] as const;

/** Tool name constants — for type-safe tool references in agent prompts */
export const TOOL_NAMES = {
  dsm5Lookup: 'dsm5_lookup',
  icd10Search: 'icd10_search',
  riskProtocol: 'risk_protocol_lookup',
  transcriptCitation: 'extract_citation',
  confidenceScorer: 'confidence_scorer',
  pubmedSearch: 'pubmed_search',
  rxnormLookup: 'rxnorm_lookup',
  drugInteraction: 'drug_interaction_check',
  guidelinesRAG: 'clinical_guidelines_search',
  priorNotesSearch: 'prior_notes_search',
} as const;
