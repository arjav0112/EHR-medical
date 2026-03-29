import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import type { GraphState } from '../graph';
import type { RiskFlag } from '../types/index';

const RiskOutputSchema = z.object({
  flags: z.array(
    z.object({
      type: z.enum([
        'suicidal_ideation',
        'self_harm',
        'abuse_disclosure',
        'medication_noncompliance',
        'psychosis_indicator',
        'other',
      ]),
      severity: z.enum(['low', 'moderate', 'high', 'critical']),
      evidence: z.string().describe('Verbatim quote from the transcript — required'),
      transcriptLocation: z.string().describe('e.g. "lines:67-68"'),
      protocolTriggered: z.string(),
      requiresImmediateAction: z.boolean(),
    }),
  ),
  overallRiskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
});

const SYSTEM_PROMPT = `You are a mental health risk assessment specialist.

Carefully screen the transcript for these risk categories:
- suicidal_ideation: any thoughts of suicide, death wish, passive suicidal ideation
- self_harm: cutting, burning, or any non-suicidal self-injury
- abuse_disclosure: disclosure of physical, sexual, emotional abuse (current or historical)
- medication_noncompliance: patient reporting not taking prescribed medications
- psychosis_indicator: hallucinations, delusions, disorganized thought, paranoia

MANDATORY RULES:
1. Every flag MUST include verbatim evidence — a direct quote from the transcript. Do not flag without a quote.
2. Set requiresImmediateAction: true ONLY for severity 'critical' or 'high' suicidal_ideation.
3. Set protocolTriggered to the clinical protocol name (e.g., "Columbia Suicide Severity Protocol", "Mandatory Reporting", "Medication Review").
4. If no risks are found, return empty flags array with overallRiskLevel: 'low'.
5. overallRiskLevel must reflect the single worst flag severity, or 'low' if no flags.

Return structured JSON only.`;

export async function riskNode(state: GraphState): Promise<Partial<GraphState>> {
  try {
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0,
    }).withStructuredOutput(RiskOutputSchema);

    const result = await model.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Patient age: ${state.input.patient.age} | Session type: ${state.input.session.sessionType}

TRANSCRIPT:
${state.input.session.transcript}`,
      },
    ]);

    // Enforce: requiresImmediateAction only for critical/high suicidal_ideation
    const flags: RiskFlag[] = result.flags.map((f: z.infer<typeof RiskOutputSchema>['flags'][number]) => ({
      ...f,
      requiresImmediateAction:
        f.type === 'suicidal_ideation' &&
        (f.severity === 'critical' || f.severity === 'high'),
      status: 'pending' as const,
    }));

    const hasImmediateAction = flags.some((f) => f.requiresImmediateAction);

    return {
      riskFlags: flags,
      ...(hasImmediateAction
        ? { error: null }  // don't overwrite error, planAgent will check this
        : {}),
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'risk',
          action: 'ai_generated',
          details: `${flags.length} flag(s) detected. Overall: ${result.overallRiskLevel}. Immediate action: ${hasImmediateAction}`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `RISK_AGENT_ERROR: ${message}` };
  }
}
