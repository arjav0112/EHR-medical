import { z } from 'zod';

// ─── Session Input ─────────────────────────────────────────────────────────────

export interface SessionInput {
  session: {
    transcript: string;
    sessionNumber: number;
    sessionType: 'intake' | 'follow_up' | 'crisis';
    durationMinutes: number;
    modality: 'in_person' | 'telehealth';
  };
  patient: {
    id: string;                    // anonymized ID only — no real PII
    age: number;
    gender: string;
    knownDiagnoses: string[];      // DSM-5 codes e.g. ["F32.1"]
    currentMedications: string[];
  };
  priorNotes: Array<{
    session: number;
    soapNote: string;
  }>;
  clinicianPreferences: {
    noteVerbosity: 'concise' | 'standard' | 'detailed';
    alwaysIncludeRiskSection: boolean;
  };
}

// ─── SOAP ──────────────────────────────────────────────────────────────────────

export interface SOAPSection {
  content: string;
  confidence: number;             // 0-1
  sourceCitations: string[];      // e.g. ["transcript:lines:12-18"]
  status: 'draft' | 'approved' | 'edited' | 'revised';
  revisionRounds: number;
  provenanceTag: 'ai_drafted' | 'ai_revised' | 'clinician_edited' | 'approved';
}

export interface SOAPNote {
  subjective: SOAPSection;
  objective: SOAPSection;
  assessment: SOAPSection;
  plan: SOAPSection;
}

// ─── Risk Flags ───────────────────────────────────────────────────────────────

export interface RiskFlag {
  type:
    | 'suicidal_ideation'
    | 'self_harm'
    | 'abuse_disclosure'
    | 'medication_noncompliance'
    | 'psychosis_indicator'
    | 'other';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  evidence: string;               // verbatim transcript excerpt
  transcriptLocation: string;     // "lines:67-68"
  protocolTriggered: string;
  requiresImmediateAction: boolean;
  status: 'pending' | 'confirmed' | 'dismissed';
}

// ─── Diagnosis ────────────────────────────────────────────────────────────────

export interface DiagnosisSuggestion {
  dsm5Code: string;               // e.g. "F32.1"
  label: string;
  confidence: number;
  supportingCriteria: string[];
  conflictingSignals: string[];
  priorDiagnosisMatch: boolean;
}

// ─── Treatment Plan ───────────────────────────────────────────────────────────

export interface TreatmentPlan {
  currentGoalsProgress: Array<{
    goal: string;
    status: 'on_track' | 'in_progress' | 'stalled' | 'achieved';
    evidenceFromSession: string;
  }>;
  newInterventions: string[];
  nextSessionFocus: string;
  referrals: string[];
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  timestamp: string;
  section: string;
  action:
    | 'ai_generated'
    | 'clinician_approved'
    | 'clinician_edited'
    | 'ai_revised'
    | 'clinician_dismissed';
  details?: string;
}

// ─── Review Package ───────────────────────────────────────────────────────────

export interface ReviewPackage {
  sessionId: string;
  reviewStatus: 'pending_clinician_review' | 'in_review' | 'complete';
  riskFlags: RiskFlag[];
  soapNote: SOAPNote;
  diagnosisSuggestions: DiagnosisSuggestion[];
  treatmentPlan: TreatmentPlan | null;
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
  agentMetadata: {
    processingTimeMs: number;
    transcriptQualityScore: number;
    agentsInvoked: string[];
    lowConfidenceSections: string[];
  };
  auditLog: AuditEntry[];
}

// ─── LangGraph State ──────────────────────────────────────────────────────────

export interface GraphState {
  input: SessionInput;
  transcriptQualityScore: number;
  soapNote: Partial<SOAPNote>;
  riskFlags: RiskFlag[];
  diagnosisSuggestions: DiagnosisSuggestion[];
  treatmentPlan: TreatmentPlan | null;
  reviewPackage: ReviewPackage | null;
  auditLog: AuditEntry[];
  error: string | null;
}

// ─── Zod Schemas (API validation) ─────────────────────────────────────────────

export const SessionInputSchema = z.object({
  session: z.object({
    transcript: z.string().min(1, 'Transcript cannot be empty'),
    sessionNumber: z.number().int().positive(),
    sessionType: z.enum(['intake', 'follow_up', 'crisis']),
    durationMinutes: z.number().int().positive(),
    modality: z.enum(['in_person', 'telehealth']),
  }),
  patient: z.object({
    id: z.string().min(1),
    age: z.number().int().min(0).max(130),
    gender: z.string(),
    knownDiagnoses: z.array(z.string()),
    currentMedications: z.array(z.string()),
  }),
  priorNotes: z.array(
    z.object({
      session: z.number().int().positive(),
      soapNote: z.string(),
    }),
  ),
  clinicianPreferences: z.object({
    noteVerbosity: z.enum(['concise', 'standard', 'detailed']),
    alwaysIncludeRiskSection: z.boolean(),
  }),
});

export type SessionInputValidated = z.infer<typeof SessionInputSchema>;
