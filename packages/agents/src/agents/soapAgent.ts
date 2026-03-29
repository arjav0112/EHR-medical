import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import type { GraphState } from '../graph';
import type { SOAPNote } from '../types/index';

const soapSection = () =>
  z.object({
    content: z.string(),
    confidence: z.number().min(0).max(1),
    sourceCitations: z.array(z.string()),
  });

const SOAPOutputSchema = z.object({
  subjective: soapSection(),
  objective: soapSection(),
  assessment: soapSection(),
  plan: soapSection(),
});

function buildSystemPrompt(sessionType: string, verbosity: string): string {
  return `You are an expert mental health clinician generating a SOAP note from a therapy session transcript.

Session type: ${sessionType}
Note verbosity: ${verbosity}

Rules you MUST follow:
1. CITE specific transcript line ranges for EVERY factual claim using format "transcript:lines:X-Y".
   Estimate line numbers from the transcript content — do not use placeholder numbers.
2. NEVER fabricate clinical details not present in the transcript.
3. Use formal clinical language appropriate to a ${sessionType} session.
4. Confidence scores (0-1) reflect how well the transcript supports that section.
   Mark 0.75+ only when there is clear, direct evidence.
5. Subjective: patient's own words, symptoms, chief complaint.
6. Objective: observable data — affect, appearance, behavior, MSE findings from transcript.
7. Assessment: clinical formulation, diagnostic impressions based on session content.
8. Plan: interventions discussed, homework, medications mentioned, follow-up.

Return structured JSON only.`;
}

export async function soapNode(state: GraphState): Promise<Partial<GraphState>> {
  try {
    const { session, patient, clinicianPreferences } = state.input;

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0.2,
    }).withStructuredOutput(SOAPOutputSchema);

    const priorContext =
      state.input.priorNotes.length > 0
        ? `\n\nPrior session notes (for context):\n${state.input.priorNotes
            .map((n) => `Session ${n.session}: ${n.soapNote.slice(0, 400)}`)
            .join('\n---\n')}`
        : '';

    const result = await model.invoke([
      {
        role: 'system',
        content: buildSystemPrompt(session.sessionType, clinicianPreferences.noteVerbosity),
      },
      {
        role: 'user',
        content: `Patient ID: ${patient.id} | Age: ${patient.age} | Gender: ${patient.gender}
Known diagnoses: ${patient.knownDiagnoses.join(', ') || 'None'}
Current medications: ${patient.currentMedications.join(', ') || 'None'}
Session #${session.sessionNumber} | ${session.durationMinutes} min | ${session.modality}
${priorContext}

TRANSCRIPT:
${session.transcript}`,
      },
    ]);

    const lowConfidenceSections: string[] = [];

    const toSection = (
      key: keyof typeof result,
      raw: typeof result[keyof typeof result],
    ) => {
      if (raw.confidence < 0.75) lowConfidenceSections.push(key as string);
      return {
        content: raw.content,
        confidence: raw.confidence,
        sourceCitations: raw.sourceCitations,
        status: 'draft' as const,
        revisionRounds: 0,
        provenanceTag: 'ai_drafted' as const,
      };
    };

    const soapNote: SOAPNote = {
      subjective: toSection('subjective', result.subjective),
      objective: toSection('objective', result.objective),
      assessment: toSection('assessment', result.assessment),
      plan: toSection('plan', result.plan),
    };

    return {
      soapNote,
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'soap',
          action: 'ai_generated',
          details: `Low confidence sections: ${lowConfidenceSections.join(', ') || 'none'}`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `SOAP_AGENT_ERROR: ${message}` };
  }
}
