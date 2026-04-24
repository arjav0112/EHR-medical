import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import type { GraphState } from '../graph';
import type { RiskFlag } from '../types/index';
import type { RunnableConfig } from '@langchain/core/runnables';

const RiskOutputSchema = z.object({
  flags: z.array(
    z.object({
      type: z.enum([
        'suicidal_ideation',
        'self_harm',
        'homicidal_ideation',
        'abuse_disclosure',
        'medication_noncompliance',
        'psychosis_indicator',
        'substance_abuse',
        'other',
      ]),
      severity: z.enum(['low', 'moderate', 'high', 'critical']),
      evidence: z.string().describe('Verbatim or near-verbatim quote from the transcript — required for every flag'),
      transcriptLocation: z.string().describe('e.g. "lines:67-68"'),
      protocolTriggered: z.string().describe('Exact clinical protocol name, e.g. "Columbia Suicide Severity Rating Scale (C-SSRS)", "Mandatory Abuse Reporting Protocol", "Medication Reconciliation Review"'),
      requiresImmediateAction: z.boolean(),
      clinicalRationale: z.string().describe('One sentence explaining why this flag was raised and the clinical risk it represents'),
      secondaryRiskFactors: z.array(z.string()).describe('Co-occurring factors that amplify this risk, e.g. "recent medication discontinuation", "social isolation", "financial crisis", "history of prior attempt"'),
    }),
  ),
  suicidalIdeationAssessment: z.object({
    ideationPresent: z.boolean(),
    ideationDenied: z.boolean().describe('True if patient explicitly denied SI — document denial even when negative'),
    denialStatement: z.string().describe('Document the denial in clinical language, e.g. "Suicidal ideation denied; denial appears convincing with no behavioral indicators suggesting concealment." If ideation IS present, leave empty string.'),
    planPresent: z.boolean().describe('Does the patient have a specific plan for suicide?'),
    meansAccess: z.boolean().describe('Does the patient have access to means (firearms, medications, etc.)?'),
    intentPresent: z.boolean().describe('Has the patient expressed intent to act?'),
    priorAttemptHistory: z.boolean().describe('Does any session content reference prior suicide attempts?'),
    cSsrsLevel: z.enum(['none', 'passive', 'active_without_plan', 'active_with_plan', 'active_with_intent']).describe('Columbia Suicide Severity Rating Scale classification based on session content'),
  }),
  homicidalIdeationAssessment: z.object({
    ideationPresent: z.boolean(),
    ideationDenied: z.boolean(),
    denialStatement: z.string().describe('Document denial in clinical language, e.g. "Homicidal ideation denied." If HI is present, leave empty string.'),
  }),
  overallRiskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
  safetyPlanStatus: z.enum(['not_indicated', 'reviewed_existing', 'updated', 'newly_created', 'required_but_not_documented']).describe('Status of safety planning based on session content'),
});

const SYSTEM_PROMPT = `You are a licensed clinical risk assessment specialist trained in the Columbia Suicide Severity Rating Scale (C-SSRS) and mandatory reporting protocols. Your role is to conduct an exhaustive, medico-legally defensible psychiatric risk assessment of every session.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL MEDICO-LEGAL REQUIREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You MUST explicitly document BOTH the PRESENCE and ABSENCE of suicidal and homicidal ideation in EVERY session.
Failure to document a negative finding (e.g., patient denied SI) is a major clinical and legal liability.
Even when all risk screens are negative, document them explicitly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RISK CATEGORIES TO SCREEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SUICIDAL IDEATION — Classify using the C-SSRS framework:
   • Passive: "I wish I were dead" / death wish without active plan
   • Active without plan: Thinking about killing self, no specific method
   • Active with plan: Has a method in mind
   • Active with intent: Plans to act on it
   Screen for: hopelessness, entrapment ("feel trapped"), burdensomeness ("everyone would be better off"), giving away possessions, saying goodbyes, prior attempt history.

2. SELF-HARM — Non-suicidal self-injury: cutting, burning, hitting self, hair-pulling, etc.
   Note frequency, method, location on body if stated.

3. HOMICIDAL IDEATION — Any thoughts of harming another person. Note if specific target identified.

4. ABUSE DISCLOSURE — Current or historical physical, sexual, or emotional abuse.
   Mandatory reporting applies if the patient is a minor or a vulnerable adult, or if a child is at risk.

5. MEDICATION NONCOMPLIANCE — Patient reports stopping, skipping, or reducing prescribed medications without clinical guidance.
   Secondary risk: abrupt discontinuation of lithium, antipsychotics, or antidepressants.

6. PSYCHOSIS INDICATORS — Hallucinations (auditory, visual, tactile, olfactory), delusions (paranoid, grandiose, somatic), disorganized thought, ideas of reference.

7. SUBSTANCE ABUSE — Active use of alcohol, cannabis, opioids, stimulants, or other substances. Note if use is escalating or concurrent with psychiatric medications.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECONDARY RISK FACTOR AMPLIFIERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For every flag, identify co-occurring factors that elevate clinical concern:
• History of prior suicide attempts
• Abrupt psychiatric medication discontinuation
• Recent major loss (job, relationship, bereavement)
• Social isolation / lack of support system
• Financial distress threatening lifestyle stability
• Impulsive or unpredictable behavior pattern
• Active substance use
• Access to lethal means (firearms, hoarded medications)
• Severe hopelessness (Beck Hopelessness Scale indicators)
• Significant relationship conflict or domestic violence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLAGS & SEVERITY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Every flag MUST include verbatim evidence from the transcript. Do NOT flag without a direct quote.
• severity 'critical': Active SI with plan + intent, active HI with plan, acute psychosis with command hallucinations.
• severity 'high': Active SI without plan, active HI without specific target, active self-harm, acute psychosis.
• severity 'moderate': Passive SI, self-harm ideation without action, psychosis indicators (subclinical), significant medication noncompliance.
• severity 'low': Remote history references, passing ideation denied upon questioning, minor medication noncompliance.
• requiresImmediateAction: true ONLY for 'critical' or 'high' suicidal_ideation or homicidal_ideation.
• protocolTriggered must name an actual clinical protocol (e.g., "Columbia Protocol (C-SSRS)", "Tarasoff Warning Protocol", "Mandatory Child Abuse Reporting", "Psychiatric Hold Evaluation (5150/302)", "Medication Safety Review").
• If NO risks are found: return empty flags array, overallRiskLevel: 'low', and document denial statements.

Return structured JSON only.`;

export async function riskNode(state: GraphState, config: RunnableConfig): Promise<Partial<GraphState>> {
  try {
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0,
      maxRetries: 6,
    }).withStructuredOutput(RiskOutputSchema);

    const result = await model.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Patient age: ${state.input.patient.age} | Gender: ${state.input.patient.gender}
Known diagnoses: ${state.input.patient.knownDiagnoses.join(', ') || 'None on record'}
Current medications: ${state.input.patient.currentMedications.join(', ') || 'None'}
Session type: ${state.input.session.sessionType} | Session #${state.input.session.sessionNumber}

SOAP OBJECTIVE / MSE (for behavioral observations):
${state.soapNote?.objective?.content ?? 'Not yet available'}

FULL TRANSCRIPT:
${state.input.session.transcript}`,
      },
    ], config);

    // Enforce: requiresImmediateAction only for critical/high SI or HI
    const flags: RiskFlag[] = result.flags.map((f) => ({
      type: f.type as RiskFlag['type'],
      severity: f.severity,
      evidence: f.evidence,
      transcriptLocation: f.transcriptLocation,
      protocolTriggered: f.protocolTriggered,
      requiresImmediateAction:
        (f.type === 'suicidal_ideation' || f.type === 'homicidal_ideation') &&
        (f.severity === 'critical' || f.severity === 'high'),
      status: 'pending' as const,
    }));

    const hasImmediateAction = flags.some((f) => f.requiresImmediateAction);

    // Build SI/HI denial documentation for audit trail
    const siDenialDoc = !result.suicidalIdeationAssessment.ideationPresent
      ? result.suicidalIdeationAssessment.denialStatement
      : `SI PRESENT — C-SSRS Level: ${result.suicidalIdeationAssessment.cSsrsLevel}`;

    const hiDenialDoc = !result.homicidalIdeationAssessment.ideationPresent
      ? result.homicidalIdeationAssessment.denialStatement
      : 'HI PRESENT — See risk flags';

    return {
      riskFlags: flags,
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'risk',
          action: 'ai_generated',
          details: [
            `${flags.length} flag(s) detected. Overall: ${result.overallRiskLevel}.`,
            `SI Assessment: ${siDenialDoc}`,
            `HI Assessment: ${hiDenialDoc}`,
            `C-SSRS Level: ${result.suicidalIdeationAssessment.cSsrsLevel}.`,
            `Safety plan status: ${result.safetyPlanStatus}.`,
            `Immediate action required: ${hasImmediateAction}.`,
          ].join(' | '),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `RISK_AGENT_ERROR: ${message}` };
  }
}
