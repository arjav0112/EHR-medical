import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import type { GraphState } from '../graph';
import type { RunnableConfig } from '@langchain/core/runnables';
import {
  guidelinesRAGTool,
  priorNotesSearchTool,
  rxnormLookupTool,
} from '../tools';

const TreatmentPlanOutputSchema = z.object({
  currentGoalsProgress: z.array(
    z.object({
      goal: z.string(),
      status: z.enum(['on_track', 'in_progress', 'stalled', 'achieved']),
      evidenceFromSession: z.string().describe('Specific session content that supports this status assessment'),
    }),
  ),
  pharmacotherapy: z.array(
    z.object({
      medication: z.string(),
      dose: z.string(),
      frequency: z.string(),
      changeType: z.enum(['continue', 'new', 'dose_increase', 'dose_decrease', 'discontinue', 'switch']),
      rationale: z.string().describe('Clinical justification for this pharmacotherapy decision, tied to diagnosis or symptom response'),
      monitoringRequired: z.string().describe('Specific monitoring needed, e.g. "Lithium level in 5 days", "CBC in 2 weeks", "blood pressure at next visit". Use "routine monitoring" if no special tracking needed.'),
    }),
  ).describe('All medication decisions from this session. Empty array if no medications discussed.'),
  newInterventions: z.array(
    z.object({
      intervention: z.string().describe('Specific intervention with modality and frequency, e.g. "CBT thought records — 3x weekly targeting catastrophic thinking", not just "CBT"'),
      targetSymptom: z.string().describe('The specific symptom or problem this intervention addresses'),
      timeframe: z.string().describe('When this should be implemented, e.g. "beginning next session", "immediately", "within 2 weeks"'),
    }),
  ),
  patientEducation: z.array(z.string()).describe('Specific topics discussed with the patient or family during this session, e.g. "Sleep hygiene and circadian rhythm disruption in depression", "Medication titration timeline and expected response window"'),
  safetyPlanActions: z.array(z.string()).describe('Specific safety-related plan items. Empty if no risk indicated. E.g. "Safety plan reviewed and updated — patient identified 3 coping strategies and 2 support contacts", "Columbia C-SSRS administered — score 2/25"'),
  referrals: z.array(
    z.object({
      specialist: z.string(),
      indication: z.string(),
      urgency: z.enum(['routine', 'urgent', 'stat']),
    }),
  ).describe('Only include if clearly clinically indicated by session content'),
  labsOrDiagnostics: z.array(
    z.object({
      test: z.string(),
      rationale: z.string(),
      timeframe: z.string(),
    }),
  ).describe('Any labs or tests ordered. E.g. TSH to rule out thyroid etiology, lithium level check, metabolic panel for antipsychotic monitoring'),
  nextSessionFocus: z.string().describe('One clear, specific clinical priority for the next session — not generic. E.g. "Review response to sertraline titration and reassess PHQ-9; continue exposure hierarchy for panic disorder"'),
  followUpTimeline: z.string().describe('Specific return appointment timeframe with rationale, e.g. "Return in 2 weeks for medication response check-in; sooner if safety concerns arise or symptoms acutely worsen"'),
  blockedReason: z.string().optional().describe('Set only if immediate risk action is blocking standard treatment planning'),
});

const SYSTEM_PROMPT = `You are a senior psychiatric clinician and treatment planning specialist. Generate a complete, clinically precise treatment plan update that a board-certified psychiatrist would be proud to sign.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLINICAL PLANNING STANDARDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOAL PROGRESS ASSESSMENT:
• Review each prior treatment goal against THIS session's content.
• 'achieved': Clear resolution or functional restoration documented.
• 'on_track': Measurable improvement with consistent progress.
• 'in_progress': Some movement but goal not yet near completion.
• 'stalled': No discernible progress or regression since last session.
• Evidence must be specific (cite session content, not generic statements).

PHARMACOTHERAPY DECISIONS (critical for accuracy):
• Only document medications explicitly mentioned in the session transcript or SOAP plan.
• 'continue': No change, patient tolerating well.
• 'dose_increase' / 'dose_decrease': Must include reason (e.g., "partial response", "side effects").
• 'discontinue': Must include reason and any tapering plan if applicable.
• 'new': New prescription — include full dose, freq, and clinical indication.
• 'switch': Switching from one agent to another — document both.
• Rationale must be clinically grounded (e.g., "Increasing sertraline 50mg → 100mg due to partial response after 4 weeks; PHQ-9 improved from 18 to 14 but remains in moderate range").
• monitoringRequired: Be specific — lithium levels, metabolic panels, blood pressure, CBC, LFTs, etc.

THERAPEUTIC INTERVENTIONS:
• Be highly specific — not just "CBT" but "CBT thought record exercise targeting automatic negative thoughts around work performance — assign 3x weekly between sessions".
• Not just "supportive therapy" but "motivational interviewing to explore ambivalence about medication compliance".
• Tie every intervention to a specific symptom or diagnosis from the Assessment section.

PATIENT EDUCATION:
• Document what was ACTUALLY discussed in this session, not what should be standard practice.
• Examples: "Psychoeducation on depression as a biologically-based illness to reduce self-blame", "Discussed the expected 2–4 week lag for SSRI therapeutic effect", "Reviewed early signs of manic episode for self-monitoring".

SAFETY PLAN ACTIONS:
• If any risk flag is present: document what was specifically done (e.g., "Safety plan updated — patient identified calling crisis line 988 and texting sister as coping steps").
• If risk is absent: state "Safety screen completed; no safety planning indicated at this time."
• Document C-SSRS score if administered.

REFERRALS:
• Only include if session content clearly indicates a referral was made or is clinically necessary.
• urgency 'stat': life-threatening or decompensating condition requiring same-day action.
• urgency 'urgent': significant clinical need within 1–7 days.
• urgency 'routine': standard coordination within weeks.

LABS & DIAGNOSTICS:
• Include any lab orders that are clinically indicated based on medications or diagnoses.
• Common psychiatric monitoring: lithium levels, valproate levels, TSH (fatigue/mood), metabolic panel (antipsychotics), CBC (clozapine), HbA1c (metabolic syndrome), urine drug screen.

FOLLOW-UP:
• Be specific — "2 weeks" not "as needed".
• Always include a contingency: "sooner if [specific trigger]".

BLOCKED PLAN (when immediate risk exists):
• If requiresImmediateAction is true on any risk flag, set blockedReason explaining why routine treatment planning is deferred.
• Still document safety interventions even when blocked.

Return structured JSON only.`;

// ─── Tool context pre-gatherer ───────────────────────────────────────────────

async function gatherPlanToolContext(
  patientId: string,
  primaryDiagnosis: string,
  currentMedications: string[],
): Promise<string> {
  const parts: string[] = [];

  try {
    // 1. Evidence-based treatment guidelines for primary diagnosis
    const guidelines = await guidelinesRAGTool.invoke({
      query: `first-line treatment ${primaryDiagnosis || 'major depressive disorder'}`,
      top_k: 4,
    });
    const g = JSON.parse(guidelines);
    if (g.chunks?.length) {
      parts.push(
        `EVIDENCE-BASED TREATMENT GUIDELINES:\n${g.chunks
          .map((c: { source: string; text: string }) => `[${c.source}]: ${c.text}`)
          .join('\n')}`,
      );
    }
  } catch { /* non-critical */ }

  try {
    // 2. Prior goals and treatment progress from vector store
    const prior = await priorNotesSearchTool.invoke({
      patient_id: patientId,
      query: 'treatment goals homework outcomes progress stalled interventions',
      top_k: 3,
    });
    const p = JSON.parse(prior);
    if (p.passages?.length) {
      parts.push(
        `PRIOR TREATMENT HISTORY:\n${p.passages
          .map((x: { session_number: number; text: string }) => `Session ${x.session_number}: ${x.text}`)
          .join('\n---\n')}`,
      );
    }
  } catch { /* non-critical */ }

  try {
    // 3. Medication class info for pharmacotherapy decisions
    if (currentMedications.length > 0) {
      const medInfos: string[] = [];
      for (const med of currentMedications.slice(0, 3)) {
        const rx = await rxnormLookupTool.invoke({ medication_name: med });
        const r = JSON.parse(rx);
        if (!r.error) {
          medInfos.push(`${med}: ${r.drug_class ?? r.class ?? 'unknown class'} — ${r.clinical_notes?.slice(0, 150) ?? ''}`);
        }
      }
      if (medInfos.length) {
        parts.push(`CURRENT MEDICATION PROFILES:\n${medInfos.join('\n')}`);
      }
    }
  } catch { /* non-critical */ }

  return parts.length
    ? `\n\n--- PLAN TOOL CONTEXT ---\n${parts.join('\n\n')}`
    : '';
}

export async function planNode(state: GraphState, config: RunnableConfig): Promise<Partial<GraphState>> {
  try {
    const hasImmediateRisk = state.riskFlags.some((f) => f.requiresImmediateAction);

    if (hasImmediateRisk) {
      const criticalFlags = state.riskFlags
        .filter((f) => f.requiresImmediateAction)
        .map((f) => `${f.type} (${f.severity}) — ${f.protocolTriggered}`)
        .join(', ');

      return {
        treatmentPlan: null,
        auditLog: [
          {
            timestamp: new Date().toISOString(),
            section: 'treatment_plan',
            action: 'ai_generated',
            details: `BLOCKED: Immediate clinical action required for — ${criticalFlags}. Standard treatment planning deferred pending crisis intervention and clinician review.`,
          },
        ],
      };
    }

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      maxRetries: 6,
    }).withStructuredOutput(TreatmentPlanOutputSchema);

    // Pre-gather treatment guidelines + prior goals + medication context
    const primaryDiagnosis =
      state.diagnosisSuggestions[0]?.label ?? state.input.patient.knownDiagnoses[0] ?? '';
    const toolContext = await gatherPlanToolContext(
      state.input.patient.id,
      primaryDiagnosis,
      state.input.patient.currentMedications,
    );

    const priorGoals =
      state.input.priorNotes.length > 0
        ? state.input.priorNotes
          .map((n) => `Session ${n.session}:\n${n.soapNote.slice(0, 600)}`)
          .join('\n---\n')
        : 'No prior notes available — this may be an intake session.';

    const riskSummary =
      state.riskFlags.length === 0
        ? 'No active risk flags.'
        : state.riskFlags
          .map((f) => `• ${f.type} / ${f.severity} — ${f.protocolTriggered}`)
          .join('\n');

    const result = await model.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `SOAP PLAN SECTION (clinician-extracted):
${state.soapNote.plan?.content ?? 'Not available'}

SOAP ASSESSMENT SECTION (contains diagnosis):
${state.soapNote.assessment?.content ?? 'Not available'}

SOAP SUBJECTIVE SECTION:
${state.soapNote.subjective?.content ?? 'Not available'}

RISK FLAGS:
${riskSummary}
${toolContext}

PRIOR SESSION NOTES (for goal progress tracking):
${priorGoals}

PATIENT CONTEXT:
Age: ${state.input.patient.age} | Gender: ${state.input.patient.gender}
Current medications: ${state.input.patient.currentMedications.join(', ') || 'None on record'}
Session type: ${state.input.session.sessionType} | Session #${state.input.session.sessionNumber}
Clinician preference: verbosity=${state.input.clinicianPreferences.noteVerbosity}`,
      },
    ], config);

    return {
      treatmentPlan: {
        currentGoalsProgress: result.currentGoalsProgress,
        newInterventions: result.newInterventions.map((i) => `${i.intervention} [Target: ${i.targetSymptom}] [Timeframe: ${i.timeframe}]`),
        nextSessionFocus: result.nextSessionFocus,
        referrals: result.referrals.map((r) => `${r.specialist} — ${r.indication} (${r.urgency})`),
      },
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'treatment_plan',
          action: 'ai_generated',
          details: [
            `${result.newInterventions.length} intervention(s).`,
            `${result.pharmacotherapy.length} pharmacotherapy decision(s).`,
            `${result.referrals.length} referral(s).`,
            `${result.labsOrDiagnostics.length} lab order(s).`,
            `Follow-up: ${result.followUpTimeline}`,
          ].join(' '),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `PLAN_AGENT_ERROR: ${message}` };
  }
}
