// ─── Graph ────────────────────────────────────────────────────────────────────
export { ehrGraph } from './graph';

// ─── Individual Agent Nodes (used by Inngest step functions) ──────────────────
export { transcriptQualityNode } from './agents/transcriptQualityAgent';
export { soapNode } from './agents/soapAgent';
export { riskNode } from './agents/riskAgent';
export { dsmNode } from './agents/dsmAgent';
export { planNode } from './agents/planAgent';
export { hallucinationGuardNode } from './agents/hallucinationGuardAgent';
export { reviewBundlerNode } from './agents/reviewBundler';

// ─── Standalone Agents ────────────────────────────────────────────────────────
export { reviseSection } from './agents/revisionAgent';
export type { RevisionInput } from './agents/revisionAgent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  SessionInput,
  SessionInputValidated,
  SOAPSection,
  SOAPNote,
  RiskFlag,
  DiagnosisSuggestion,
  TreatmentPlan,
  AuditEntry,
  ReviewPackage,
  GraphState,
  HallucinationReport,
  SectionGuardResult,
  BarometerLevel,
  BarometerTrend,
  SingleBarometer,
  VitalSignsBarometer,
  ObjectiveBarometers,
  AssessmentCriteriaRow,
} from './types/index';

export { SessionInputSchema } from './types/index';

// ─── RAG / Tools ──────────────────────────────────────────────────────────────
export {
  ALL_TOOLS,
  LOCAL_TOOLS,
  NETWORK_TOOLS,
  TOOL_NAMES,
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
  indexPriorNotes,
} from './tools/index';

// ─── Embeddings / VectorStore ─────────────────────────────────────────────────
export { getEmbeddings } from './embeddings';
export { getVectorStore, getRetriever, COLLECTIONS } from './vectorstore';
export type { CollectionName } from './vectorstore';

// ─── LLM Factory ─────────────────────────────────────────────────────────────
export { getLLM, getStreamingLLM } from './llm';

// ─── Data Loaders ─────────────────────────────────────────────────────────────
export {
  loadDSM5Criteria,
  loadICD10Index,
  loadDrugLabels,
  loadTherapyProtocols,
  loadRiskScales,
  getICD10Label,
  getMedicationInfo,
} from './data/index';
