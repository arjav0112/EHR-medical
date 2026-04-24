import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import type { GraphState } from '../graph';
import type { HallucinationReport, SectionGuardResult } from '../types/index';

// ─── Schema ───────────────────────────────────────────────────────────────────

// Factory — called separately for each section so Zod never emits $ref
const makeSectionGuardSchema = () =>
  z.object({
    groundedConfidence: z
      .number()
      .min(0)
      .max(1)
      .describe(
        'Independent confidence that the section content is accurate and fully supported by the transcript (0 = completely ungrounded, 1 = fully grounded).',
      ),
    hallucinationRisk: z
      .number()
      .min(0)
      .max(1)
      .describe(
        'Estimated probability that this section contains fabricated, hallucinated, or unsupported clinical details (0 = perfectly grounded, 1 = heavily fabricated).',
      ),
    groundingIssues: z
      .array(z.string())
      .describe(
        'List of specific claims, phrases, or clinical details in the section that are NOT supported by or directly contradict the transcript. Empty array if fully grounded.',
      ),
    reasoning: z
      .string()
      .describe(
        'Step-by-step chain-of-thought explaining how you evaluated the section against the transcript and how you arrived at your scores.',
      ),
  });

const GuardOutputSchema = z.object({
  subjective: makeSectionGuardSchema(),
  objective: makeSectionGuardSchema(),
  assessment: makeSectionGuardSchema(),
  plan: makeSectionGuardSchema(),
});

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a clinical AI safety auditor — a hallucination detection agent for psychiatric documentation.

Your ONLY job is to evaluate whether each section of a generated SOAP note is factually grounded in the provided transcript. You are NOT the author of the note. You are an independent adversarial reviewer.

DEFINITION OF HALLUCINATION (in clinical context):
- A claim, diagnosis, symptom, observation, medication, or clinical detail that appears in the SOAP note BUT cannot be directly inferred from the transcript.
- Fabricated quotes attributed to the patient that do not appear in the transcript.
- Clinical measurements (e.g., PHQ-9 scores, vital signs) stated as fact without transcript support.
- DSM-5 criteria claimed as "met" without supporting transcript evidence.
- Medications, dosages, referrals, or labs mentioned that were not discussed in the session.

GROUNDING RULES:
- Reasonable clinical inference from clear transcript evidence is ALLOWED (not hallucination).
- Standard clinical language translating patient statements is ALLOWED (e.g., "anhedonia" for "I can't enjoy anything").
- Fabricating specific details NOT present in transcript is a hallucination.
- "Not observed" or "not reported" statements are fine when transcript is silent on a topic.

For each SOAP section, provide:
1. groundedConfidence (0-1): Your independent assessment of how well-supported the content is.
2. hallucinationRisk (0-1): Probability of fabricated content.
3. groundingIssues: Specific problematic phrases/claims (empty if clean).
4. reasoning: Your chain-of-thought evaluation.

SCORING CALIBRATION:
- 0.0-0.2 hallucination risk: Exemplary grounding, minor inference is acceptable
- 0.2-0.4 hallucination risk: Minor unsupported claims, worth noting  
- 0.4-0.7 hallucination risk: Significant ungrounded content, clinician must review
- 0.7-1.0 hallucination risk: Substantial fabrication detected, HIGH ALERT

Return structured JSON only. Be rigorous and adversarial — patient safety depends on your accuracy.`;

// ─── Node ─────────────────────────────────────────────────────────────────────

export async function hallucinationGuardNode(
  state: GraphState,
): Promise<Partial<GraphState>> {
  try {
    const soap = state.soapNote as Required<typeof state.soapNote>;
    const transcript = state.input.session.transcript;

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0,  // Deterministic for auditing
    }).withStructuredOutput(GuardOutputSchema);

    const result = await model.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `=== ORIGINAL TRANSCRIPT ===
${transcript.slice(0, 6000)}${transcript.length > 6000 ? '\n[transcript truncated for evaluation]' : ''}

=== GENERATED SOAP NOTE (to audit) ===

[SUBJECTIVE]
${(soap.subjective?.content ?? '(empty)').slice(0, 800)}

[OBJECTIVE]
${(soap.objective?.content ?? '(empty)').slice(0, 800)}

[ASSESSMENT]
${(soap.assessment?.content ?? '(empty)').slice(0, 800)}

[PLAN]
${(soap.plan?.content ?? '(empty)').slice(0, 800)}

Evaluate each section against the transcript. Identify any hallucinated or ungrounded clinical details.`,
      },
    ]);

    // Build per-section guard results and override confidence scores in soapNote
    const SECTIONS = ['subjective', 'objective', 'assessment', 'plan'] as const;
    const HALLUCINATION_THRESHOLD = 0.4;

    const sectionResults: SectionGuardResult[] = SECTIONS.map((key) => ({
      section: key,
      groundedConfidence: result[key].groundedConfidence,
      hallucinationRisk: result[key].hallucinationRisk,
      groundingIssues: result[key].groundingIssues,
      reasoning: result[key].reasoning,
    }));

    const flaggedSections = sectionResults
      .filter((s) => s.hallucinationRisk >= HALLUCINATION_THRESHOLD)
      .map((s) => s.section);

    const overallHallucinationRisk = Math.max(
      ...sectionResults.map((s) => s.hallucinationRisk),
    );

    const hallucinationReport: HallucinationReport = {
      sections: sectionResults,
      overallHallucinationRisk,
      flaggedSections,
    };

    // Override the self-reported confidence scores from the generating agents
    // with the externally validated groundedConfidence from this guard agent.
    const updatedSoapNote = { ...soap };
    for (const key of SECTIONS) {
      const guard = result[key];
      if (updatedSoapNote[key]) {
        updatedSoapNote[key] = {
          ...updatedSoapNote[key],
          // Replace self-reported confidence with guard-validated score
          confidence: guard.groundedConfidence,
          hallucinationRisk: guard.hallucinationRisk,
          groundingIssues: guard.groundingIssues,
        };
      }
    }

    return {
      soapNote: updatedSoapNote,
      hallucinationReport,
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'hallucination_guard',
          action: 'ai_generated',
          details: flaggedSections.length > 0
            ? `⚠ ${flaggedSections.length} section(s) flagged: ${flaggedSections.join(', ')} (max risk: ${(overallHallucinationRisk * 100).toFixed(0)}%)`
            : `✓ All sections grounded (max risk: ${(overallHallucinationRisk * 100).toFixed(0)}%)`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Non-fatal: log the error but don't block the pipeline
    return {
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'hallucination_guard',
          action: 'ai_generated',
          details: `GUARD_ERROR: ${message} — confidence scores unvalidated`,
        },
      ],
    };
  }
}
