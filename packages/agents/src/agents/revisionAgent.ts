import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { SOAPSection } from '../types/index';

export interface RevisionInput {
  section: 'subjective' | 'objective' | 'assessment' | 'plan';
  currentDraft: string;
  feedback: string;
  approvedSections: Record<string, string>;
  transcript: string;
  patientContext: {
    age: number;
    gender: string;
    knownDiagnoses: string[];
    sessionType: string;
  };
}

const SYSTEM_PROMPT = `You are a clinical documentation specialist revising a SOAP note section based on clinician feedback.

Rules:
1. Respect the feedback precisely — do not revert changes the clinician has implied they want.
2. Maintain clinical language and the same general structure as the original.
3. Keep sourceCitations accurate — update any citation references if content changes.
4. Stream your response as the revised section content only (plain clinical text, no JSON wrapper).
5. Do not add sections not present in the original. Do not remove content still supported by the transcript.`;

/**
 * Standalone streaming revision agent — NOT part of the main graph.
 * Returns an async generator that yields string chunks of the revised content,
 * along with final metadata after streaming completes.
 */
export async function* reviseSection(input: RevisionInput): AsyncGenerator<
  { chunk: string; done: false } | { done: true; section: Partial<SOAPSection> }
> {
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    streaming: true,
  });

  const userMessage = `Section to revise: ${input.section}

Current draft:
${input.currentDraft}

Clinician feedback:
${input.feedback}

Transcript (for re-citation):
${input.transcript.slice(0, 4000)}

Approved sections (for context only, do not modify):
${Object.entries(input.approvedSections)
  .map(([k, v]) => `${k}: ${v.slice(0, 300)}`)
  .join('\n---\n')}

Patient: Age ${input.patientContext.age}, ${input.patientContext.gender}, 
Session type: ${input.patientContext.sessionType},
Known diagnoses: ${input.patientContext.knownDiagnoses.join(', ') || 'None'}`;

  let fullContent = '';

  const stream = await model.stream([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  for await (const chunk of stream) {
    const text = typeof chunk.content === 'string' ? chunk.content : '';
    if (text) {
      fullContent += text;
      yield { chunk: text, done: false };
    }
  }

  // Yield final metadata after streaming completes
  yield {
    done: true,
    section: {
      content: fullContent,
      confidence: 0.8, // Post-revision confidence — clinician confirmed intent
      sourceCitations: [],  // Frontend should re-parse citations from content
      status: 'revised',
      revisionRounds: 1,   // Caller should increment from prior rounds
      provenanceTag: 'ai_revised',
    },
  };
}
