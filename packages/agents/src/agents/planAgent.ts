import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import type { GraphState } from '../graph';

const TreatmentPlanOutputSchema = z.object({
  currentGoalsProgress: z.array(
    z.object({
      goal: z.string(),
      status: z.enum(['on_track', 'in_progress', 'stalled', 'achieved']),
      evidenceFromSession: z.string(),
    }),
  ),
  newInterventions: z.array(z.string()),
  nextSessionFocus: z.string(),
  referrals: z.array(z.string()),
  blockedReason: z.string().optional(),
});

const SYSTEM_PROMPT = `You are a mental health treatment planning specialist.
Generate a structured treatment plan update based on the full clinical picture.

Rules:
1. Draw on the SOAP plan section, risk flags, and diagnoses to inform interventions.
2. Use priorNotes to assess progress on existing goals — for each prior goal, determine if it is 
   on_track, in_progress, stalled, or achieved based on session evidence.
3. newInterventions should be specific (e.g., "CBT thought record — 3x weekly", not just "CBT").
4. nextSessionFocus: one clear clinical priority for the next session.
5. referrals: only include if clearly indicated by session content.
6. If requiresImmediateAction is true on any risk flag, set blockedReason explaining the block.

Return structured JSON only.`;

export async function planNode(state: GraphState): Promise<Partial<GraphState>> {
  try {
    const hasImmediateRisk = state.riskFlags.some((f) => f.requiresImmediateAction);

    if (hasImmediateRisk) {
      const criticalFlags = state.riskFlags
        .filter((f) => f.requiresImmediateAction)
        .map((f) => `${f.type} (${f.severity})`)
        .join(', ');

      return {
        treatmentPlan: null,
        auditLog: [
          {
            timestamp: new Date().toISOString(),
            section: 'treatment_plan',
            action: 'ai_generated',
            details: `BLOCKED: Immediate action required for — ${criticalFlags}. Treatment planning deferred pending clinical intervention.`,
          },
        ],
      };
    }

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0.3,
    }).withStructuredOutput(TreatmentPlanOutputSchema);

    const priorGoals =
      state.input.priorNotes.length > 0
        ? state.input.priorNotes
            .map((n) => `Session ${n.session}:\n${n.soapNote.slice(0, 600)}`)
            .join('\n---\n')
        : 'No prior notes available';

    const diagnosisSummary = state.diagnosisSuggestions
      .map((d) => `${d.dsm5Code} ${d.label} (confidence: ${(d.confidence * 100).toFixed(0)}%)`)
      .join(', ');

    const result = await model.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `SOAP Plan section:
${state.soapNote.plan?.content ?? 'Not available'}

SOAP Assessment:
${state.soapNote.assessment?.content ?? 'Not available'}

Active diagnoses: ${diagnosisSummary || 'None confirmed'}
Risk flags: ${state.riskFlags.length === 0 ? 'None' : state.riskFlags.map((f) => `${f.type}/${f.severity}`).join(', ')}

Prior session notes (for goal progress tracking):
${priorGoals}

Clinician preferences: verbosity=${state.input.clinicianPreferences.noteVerbosity}`,
      },
    ]);

    return {
      treatmentPlan: {
        currentGoalsProgress: result.currentGoalsProgress,
        newInterventions: result.newInterventions,
        nextSessionFocus: result.nextSessionFocus,
        referrals: result.referrals,
      },
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'treatment_plan',
          action: 'ai_generated',
          details: `${result.newInterventions.length} interventions, ${result.referrals.length} referrals`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `PLAN_AGENT_ERROR: ${message}` };
  }
}
