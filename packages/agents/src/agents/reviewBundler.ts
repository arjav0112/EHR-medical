import type { GraphState } from '../graph';
import type { ReviewPackage, AuditEntry, RiskFlag } from '../types/index';

const SEVERITY_ORDER = { critical: 4, high: 3, moderate: 2, low: 1 } as const;

function getOverallRiskLevel(flags: RiskFlag[]): ReviewPackage['overallRiskLevel'] {
  if (flags.length === 0) return 'low';
  const max = flags.reduce(
    (best, f) =>
      SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[best.severity] ? f : best,
    flags[0],
  );
  return max.severity;
}

export async function reviewBundlerNode(
  state: GraphState,
): Promise<Partial<GraphState>> {
  const now = new Date().toISOString();
  const soap = state.soapNote as Required<typeof state.soapNote>;

  // Clinician review priority: risk flags first, then S→O→A→P
  const sectionAuditEntries: AuditEntry[] = [
    { timestamp: now, section: 'risk_flags', action: 'ai_generated', details: `${state.riskFlags.length} flag(s)` },
    { timestamp: now, section: 'subjective', action: 'ai_generated' },
    { timestamp: now, section: 'objective', action: 'ai_generated' },
    { timestamp: now, section: 'assessment', action: 'ai_generated' },
    { timestamp: now, section: 'plan', action: 'ai_generated' },
    { timestamp: now, section: 'diagnosis', action: 'ai_generated', details: `${state.diagnosisSuggestions.length} suggestion(s)` },
    ...(state.treatmentPlan
      ? [{ timestamp: now, section: 'treatment_plan', action: 'ai_generated' as const }]
      : []),
  ];

  const lowConfidenceSections = (
    ['subjective', 'objective', 'assessment', 'plan'] as const
  ).filter((s) => (soap[s]?.confidence ?? 1) < 0.75);

  const processingTimeMs = Date.now() - new Date(
    state.auditLog[0]?.timestamp ?? now,
  ).getTime();

  const reviewPackage: ReviewPackage = {
    sessionId: `session-${state.input.patient.id}-${state.input.session.sessionNumber}-${Date.now()}`,
    reviewStatus: 'pending_clinician_review',
    riskFlags: state.riskFlags,
    soapNote: soap as any,
    diagnosisSuggestions: state.diagnosisSuggestions,
    treatmentPlan: state.treatmentPlan,
    overallRiskLevel: getOverallRiskLevel(state.riskFlags),
    agentMetadata: {
      processingTimeMs,
      transcriptQualityScore: state.transcriptQualityScore,
      agentsInvoked: ['transcriptQuality', 'soap', 'risk', 'dsm', 'plan'].filter(
        Boolean,
      ),
      lowConfidenceSections: lowConfidenceSections as string[],
    },
    auditLog: [...state.auditLog, ...sectionAuditEntries],
  };

  return {
    reviewPackage,
    auditLog: sectionAuditEntries,
  };
}
