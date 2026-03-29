// ─── Graph ────────────────────────────────────────────────────────────────────
export { ehrGraph } from './graph';

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
} from './types/index';

export { SessionInputSchema } from './types/index';
