import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import type { GraphState } from '../graph';
import type { RunnableConfig } from '@langchain/core/runnables';
import {
  dsm5LookupTool,
  icd10SearchTool,
  guidelinesRAGTool,
  priorNotesSearchTool,
} from '../tools';

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
        intervalStatus: z.enum(['improved', 'stable', 'worsened', 'new']).describe('For known diagnoses: clinical course since last encounter. For new suggestions: "new".'),
        specifier: z.string().optional().describe('DSM-5 specifier when applicable, e.g. "severe, without psychotic features" or "single episode"'),
      }),
    )
    .max(4)
    .describe('Primary diagnosis first (highest confidence), followed by up to 3 ranked differential diagnoses'),
});

const SYSTEM_PROMPT = `You are a board-certified psychiatrist performing a DSM-5 diagnostic formulation. Your task is to generate a precise, medico-legally defensible differential diagnosis based on the SOAP note and session transcript.

CLINICAL DIAGNOSTIC STANDARDS:
1. PRIMARY DIAGNOSIS: Return exactly ONE primary working diagnosis — the most clinically supported conclusion. Use the highest level of DSM-5 specificity possible.
   - WRONG: "F32 Major Depressive Disorder"
   - CORRECT: "F32.2 Major Depressive Disorder, single episode, severe, without psychotic features"

2. DIFFERENTIAL DIAGNOSES: List up to 3 ordered differentials (highest confidence first). Each must have a distinct clinical rationale — do not list overlapping diagnoses without explanation.

3. SUPPORTING CRITERIA: For each diagnosis, list the specific DSM-5 diagnostic criteria observed in the session (e.g., "Criterion A3: depressed mood most of the day, nearly every day per patient report and MSE affect observation", "Criterion A6: fatigue and loss of energy").

4. CONFLICTING SIGNALS: Document any evidence that argues AGAINST this diagnosis or introduces diagnostic uncertainty (e.g., "Absence of persistent elevated mood argues against Bipolar I", "Symptom onset temporally linked to medication change — consider substance-induced etiology"). NEVER omit this field.

5. INTERVAL STATUS (for follow-up sessions):
   - For diagnoses matching knownDiagnoses: evaluate whether this condition is IMPROVED, STABLE, or WORSENED based on session content and MSE.
   - For newly suggested diagnoses: mark as "new".

6. CROSS-REFERENCE WITH KNOWN DIAGNOSES:
   - Set priorDiagnosisMatch: true only when your suggested diagnosis directly matches a known diagnosis code/label.
   - If your primary suggestion CONFLICTS with a known diagnosis (e.g., you suggest F32 unipolar when the patient has F31 Bipolar on record), clearly document this in conflictingSignals — do NOT silently override existing diagnoses.
   - Comorbidities are acceptable — you may suggest diagnoses that co-exist with known ones.

7. SPECIFIERS: Always add the appropriate DSM-5 specifier when the session content supports it (e.g., "with anxious distress", "with melancholic features", "in partial remission", "rapid cycling").

8. EVIDENCE STANDARD: Only diagnose what the session clearly supports. If evidence is insufficient for full diagnostic criteria, use terms like "rule out" or "provisional" in the label. Do not speculate beyond what is observable.

9. Use accurate ICD-10/DSM-5 codes. Common examples:
   - F32.0/1/2: MDD mild/moderate/severe (single episode)
   - F33.0/1/2: MDD mild/moderate/severe (recurrent)
   - F31.x: Bipolar I/II Disorder
   - F41.1: Generalized Anxiety Disorder
   - F43.10: PTSD
   - F20.9: Schizophrenia
   - F60.3: Borderline Personality Disorder

Return structured JSON only.`;

// ─── Tool context pre-gatherer ───────────────────────────────────────────────

async function gatherDsmToolContext(
  patientId: string,
  knownDiagnoses: string[],
  primaryDiagnosis: string,
): Promise<string> {
  const parts: string[] = [];

  try {
    // 1. DSM-5 criteria for all known diagnoses
    for (const code of knownDiagnoses.slice(0, 3)) {
      const dsm = await dsm5LookupTool.invoke({ code });
      const d = JSON.parse(dsm);
      if (!d.error) {
        parts.push(
          `DSM-5 [${code}] ${d.disorder ?? d.code}:\n${d.content?.slice(0, 500) ?? ''}`,
        );
      }
    }
  } catch { /* non-critical */ }

  try {
    // 2. Confirm ICD-10 codes for known diagnoses
    for (const code of knownDiagnoses.slice(0, 2)) {
      const icd = await icd10SearchTool.invoke({ query: code });
      const i = JSON.parse(icd);
      if (Array.isArray(i) && i.length) {
        parts.push(`ICD-10 [${code}]: ${i[0].description} — ${i[0].summary ?? ''}`);
      }
    }
  } catch { /* non-critical */ }

  try {
    // 3. Clinical guidelines for the primary diagnosis
    const guidelines = await guidelinesRAGTool.invoke({
      query: `diagnostic criteria ${primaryDiagnosis || knownDiagnoses[0] || 'depression'}`,
      top_k: 3,
    });
    const g = JSON.parse(guidelines);
    if (g.chunks?.length) {
      parts.push(
        `DIAGNOSTIC GUIDELINES:\n${g.chunks
          .map((c: { source: string; text: string }) => `[${c.source}]: ${c.text}`)
          .join('\n')}`,
      );
    }
  } catch { /* non-critical */ }

  try {
    // 4. Prior diagnoses history from vector store
    const prior = await priorNotesSearchTool.invoke({
      patient_id: patientId,
      query: 'prior diagnoses established conditions history interval status',
      top_k: 2,
    });
    const p = JSON.parse(prior);
    if (p.passages?.length) {
      parts.push(
        `PRIOR DIAGNOSIS HISTORY:\n${p.passages
          .map((x: { session_number: number; text: string }) => `Session ${x.session_number}: ${x.text}`)
          .join('\n')}`,
      );
    }
  } catch { /* non-critical */ }

  return parts.length
    ? `\n\n--- DSM TOOL CONTEXT ---\n${parts.join('\n\n')}`
    : '';
}

export async function dsmNode(state: GraphState, config: RunnableConfig): Promise<Partial<GraphState>> {
  try {
    const { patient, session } = state.input;
    const soapNote = state.soapNote;

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0.1,
      maxRetries: 6,
    }).withStructuredOutput(DSMOutputSchema);

    // Pre-gather DSM-5 criteria + ICD-10 codes + guidelines context
    const primaryDiagnosis = patient.knownDiagnoses[0] ?? '';
    const toolContext = await gatherDsmToolContext(
      patient.id,
      patient.knownDiagnoses,
      primaryDiagnosis,
    );

    const result = await model.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `PATIENT CLINICAL CONTEXT:
Patient: Age ${patient.age}, Gender: ${patient.gender}
Known DSM-5 diagnoses on record: ${patient.knownDiagnoses.join(', ') || 'None on record'}
Current medications: ${patient.currentMedications.join(', ') || 'None'}
Session type: ${session.sessionType} | Session #${session.sessionNumber}
${toolContext}

SOAP NOTE — ASSESSMENT SECTION:
${soapNote.assessment?.content ?? 'Not yet generated'}

SOAP NOTE — SUBJECTIVE SECTION:
${soapNote.subjective?.content ?? 'Not yet generated'}

SOAP NOTE — OBJECTIVE / MSE SECTION:
${soapNote.objective?.content ?? 'Not yet generated'}

FULL TRANSCRIPT (for direct criterion mapping):
${session.transcript.slice(0, 3500)}`,
      },
    ], config);

    return {
      diagnosisSuggestions: result.diagnosisSuggestions,
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'diagnosis',
          action: 'ai_generated',
          details: `${result.diagnosisSuggestions.length} suggestion(s). Primary: ${result.diagnosisSuggestions[0]?.dsm5Code ?? 'none'} — ${result.diagnosisSuggestions[0]?.label ?? 'unknown'}. Interval status: ${result.diagnosisSuggestions[0]?.intervalStatus ?? 'n/a'}`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `DSM_AGENT_ERROR: ${message}` };
  }
}
