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
    currentMedications: string[];
  };
}

const SECTION_CLINICAL_STANDARDS: Record<string, string> = {
  subjective: `SUBJECTIVE SECTION STANDARDS:
  • Contains ONLY patient-reported information (never clinician observations).
  • Must include: Chief Complaint (verbatim quote), HPI with 8 dimensions (Quality, Severity, Duration, Timing, Location, Context, Modifying Factors, Associated Symptoms).
  • Include Review of Systems positives and relevant negatives (sleep, appetite, energy, concentration).
  • Patient quotes preserved in speech marks.
  • Medication adherence and side effects as patient-reported.`,

  objective: `OBJECTIVE SECTION STANDARDS:
  • Contains ONLY clinician-observed data — never patient self-report.
  • Core structure is the Mental Status Examination (MSE):
    Appearance → Behavior/Psychomotor → Speech → Mood (quoted) → Affect (observed range, quality, congruence)
    → Thought Process → Thought Content (SI/HI/delusions) → Perceptions (hallucinations)
    → Cognition (orientation, memory, attention) → Insight → Judgment
  • All MSE findings documented even when within normal limits (e.g., "Thought process: linear and goal-directed").
  • Vital signs included if documented.`,

  assessment: `ASSESSMENT SECTION STANDARDS:
  • For follow-up sessions: opens with an Interval History statement (improved/stable/worsened).
  • Primary diagnosis stated with full DSM-5 specificity and applicable specifier.
  • Differential diagnoses listed with brief clinical rationale for each.
  • MSE findings explicitly tied to the diagnostic formulation.
  • Chronic conditions each labeled: IMPROVED / STABLE / WORSENED.
  • Overall clinical risk level stated (low/moderate/high/critical).`,

  plan: `PLAN SECTION STANDARDS:
  • Pharmacotherapy: drug + dose + frequency + change type + rationale + monitoring required.
  • Therapeutic interventions: specific modality + frequency + target symptom.
  • Patient education: topics actually discussed in session.
  • Safety actions: safety plan status, C-SSRS score if applicable.
  • Referrals: specialist + indication + urgency.
  • Labs/diagnostics: test + rationale.
  • Follow-up: specific timeline with contingency trigger.`,
};

const SYSTEM_PROMPT = `You are a senior clinical documentation specialist revising a SOAP note section based on clinician feedback. Your revisions must maintain the highest standard of psychiatric clinical documentation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REVISION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CLINICIAN FEEDBACK IS AUTHORITATIVE — Apply the feedback precisely and completely. Do not revert, soften, or selectively apply changes the clinician has specified.
2. PRESERVE CLINICAL STRUCTURE — The revised section must still conform to SOAP documentation standards for its specific section type. Do not degrade the clinical quality or structure.
3. MAINTAIN EVIDENCE BASE — Only include clinical claims that are supported by the transcript. Do not add information not present in the session. If feedback asks for content not in the transcript, note it as "not documented in session" rather than fabricating it.
4. CITATION INTEGRITY — Update transcript citations (format: "transcript:lines:X-Y") if content shifts to reference different transcript portions. Remove citations that no longer apply. Add citations for newly referenced content.
5. CLINICAL LANGUAGE — Maintain formal psychiatric/clinical terminology throughout. Replace lay terms with clinical equivalents (e.g., "sad" → "dysphoric mood", "can't focus" → "impaired concentration and attention").
6. CROSS-SECTION CONSISTENCY — Your revision must not contradict content in the approved sections. If the approved assessment states "MDD, severe", the revised plan should reflect appropriate severity-matched interventions.
7. SUBJECTIVE/OBJECTIVE BOUNDARIES — Enforce strictly: patient self-report belongs only in Subjective; MSE clinician observations belong only in Objective. Never blur this boundary regardless of feedback phrasing.
8. Output the revised section as plain clinical prose only — no JSON wrapper, no section headers, no markdown. Pure clinical note text.`;

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
    maxRetries: 6,
  });

  const sectionStandards = SECTION_CLINICAL_STANDARDS[input.section] ?? '';

  const userMessage = `SECTION BEING REVISED: ${input.section.toUpperCase()}

${sectionStandards}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT DRAFT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${input.currentDraft}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLINICIAN FEEDBACK (apply this precisely):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${input.feedback}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRANSCRIPT (for re-citation and fact-checking):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${input.transcript.slice(0, 4000)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APPROVED SECTIONS (context only — do not modify):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${Object.entries(input.approvedSections)
      .map(([k, v]) => `[${k.toUpperCase()}]: ${v.slice(0, 400)}`)
      .join('\n---\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATIENT CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Age: ${input.patientContext.age} | Gender: ${input.patientContext.gender}
Session type: ${input.patientContext.sessionType}
Known diagnoses: ${input.patientContext.knownDiagnoses.join(', ') || 'None'}
Current medications: ${input.patientContext.currentMedications?.join(', ') || 'None'}

Produce the revised ${input.section} section now — plain clinical prose only:`;

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

  yield {
    done: true,
    section: {
      content: fullContent,
      confidence: 0.88, // Post-revision confidence elevated — clinician has confirmed intent
      sourceCitations: [],  // Frontend should re-parse citations from revised content
      status: 'revised',
      revisionRounds: 1,
      provenanceTag: 'ai_revised',
    },
  };
}
