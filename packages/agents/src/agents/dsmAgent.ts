import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import type { GraphState } from '../graph';

const DSMOutputSchema = z.object({
  diagnosisSuggestions: z
    .array(
      z.object({
        dsm5Code: z.string(),
        label: z.string(),
        confidence: z.number().min(0).max(1),
        supportingCriteria: z.array(z.string()),
        conflictingSignals: z.array(z.string()),
        priorDiagnosisMatch: z.boolean(),
      }),
    )
    .max(4)
    .describe('Primary diagnosis first, then up to 3 differentials'),
});

const SYSTEM_PROMPT = `You are a DSM-5 diagnostic specialist.
Based on the SOAP assessment and session content, suggest the most clinically appropriate diagnoses.

Rules:
1. Return exactly ONE primary diagnosis followed by up to 3 differential diagnoses (ordered by confidence).
2. For each suggestion, list the specific DSM-5 criteria met as supportingCriteria.
3. Cross-reference with knownDiagnoses (the patient's existing diagnoses). 
   - If your suggestion matches a known diagnosis, set priorDiagnosisMatch: true.
   - If your suggestion CONFLICTS with a known diagnosis (e.g., you suggest unipolar when they have bipolar), 
     add the conflict reason to conflictingSignals — do NOT silently override.
4. Only suggest diagnoses clearly supported by session content. Do not speculate.
5. Use accurate ICD-10/DSM-5 codes (e.g., F32.1 for Major Depressive Disorder, moderate).

Return structured JSON only.`;

export async function dsmNode(state: GraphState): Promise<Partial<GraphState>> {
  try {
    const { patient, session } = state.input;
    const soapNote = state.soapNote;

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0.1,
    }).withStructuredOutput(DSMOutputSchema);

    const result = await model.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Patient: Age ${patient.age}, Gender: ${patient.gender}
Known diagnoses: ${patient.knownDiagnoses.join(', ') || 'None on record'}
Current medications: ${patient.currentMedications.join(', ') || 'None'}
Session type: ${session.sessionType}

SOAP Assessment:
${soapNote.assessment?.content ?? 'Not yet generated'}

SOAP Subjective:
${soapNote.subjective?.content ?? 'Not yet generated'}

SOAP Objective:
${soapNote.objective?.content ?? 'Not yet generated'}

TRANSCRIPT (excerpted):
${session.transcript.slice(0, 3000)}`,
      },
    ]);

    return {
      diagnosisSuggestions: result.diagnosisSuggestions,
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'diagnosis',
          action: 'ai_generated',
          details: `${result.diagnosisSuggestions.length} suggestion(s). Primary: ${result.diagnosisSuggestions[0]?.dsm5Code ?? 'none'}`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `DSM_AGENT_ERROR: ${message}` };
  }
}
