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
  return `You are an expert psychiatric clinician generating a clinically rigorous SOAP note from a therapy session transcript. Your output must be indistinguishable from a note written by a board-certified psychiatrist or PMHNP.

Session type: ${sessionType}
Note verbosity: ${verbosity}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION-BY-SECTION CLINICAL REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[S – SUBJECTIVE] — The patient's own narrative. NEVER place clinician observations here.
  • Chief Complaint (CC): Verbatim or near-verbatim quote of the primary reason for the visit (e.g., Patient reports feeling "completely numb and unable to get out of bed" for the past two weeks.)
  • History of Present Illness (HPI): Structured using the 8 HPI dimensions:
      - Location (if applicable), Quality (e.g., "constant low mood"), Severity (self-rated 0–10 where stated),
        Duration (onset and how long), Timing/Frequency, Context (precipitating events, stressors),
        Modifying Factors (what worsens or relieves symptoms), Associated Signs & Symptoms.
  • Pertinent Review of Systems (ROS): Active positives and negatives — sleep (insomnia/hypersomnia, early awakening), appetite, energy, concentration, libido, somatic complaints.
  • Patient-reported medication adherence and any side effects mentioned.
  • Include verbatim quotes from the patient to preserve their voice (e.g., Patient states: "I feel trapped.").

[O – OBJECTIVE] — Clinician-observed data only. NEVER include patient self-report here.
  For psychiatric sessions, the core objective section is the Mental Status Examination (MSE):
  • Appearance: Grooming, hygiene, dress, eye contact, apparent age vs. stated age, nutritional status.
  • Behavior/Psychomotor: Agitation, retardation, cooperation level, unusual movements, gait if applicable.
  • Speech: Rate (rapid/slow/normal), volume (loud/soft/normal), rhythm, spontaneity, coherence. Note "pressured speech" if manic indicators present.
  • Mood: Patient's stated mood in quotes (e.g., Mood: "depressed").
  • Affect: Clinician's observation — range (full/restricted/blunted/flat), quality (euthymic/dysphoric/euphoric/labile/irritable), appropriateness (congruent/incongruent with stated mood).
  • Thought Process: Linear and goal-directed vs. tangential, circumstantial, loose associations, thought blocking, flight of ideas.
  • Thought Content: Presence or absence of suicidal ideation (SI), homicidal ideation (HI), delusions (paranoid/grandiose/somatic), preoccupations, phobias.
  • Perceptions: Presence or absence of auditory/visual/tactile/olfactory hallucinations (AVH).
  • Cognition: Orientation (person/place/time/situation — "A&Ox4"), attention and concentration, short-term/long-term memory intact vs. impaired. Include MMSE/MOCA findings if administered.
  • Insight: Poor / Limited / Fair / Good — patient's awareness of their illness.
  • Judgment: Poor / Limited / Fair / Good — patient's ability to make safe, sound decisions.
  • Vital signs and BMI if documented in session.

[A – ASSESSMENT] — Clinical formulation and diagnostic reasoning.
  • For follow-up sessions: Begin with an Interval History statement — how is the patient's condition since the last encounter? (e.g., "Interval history: Patient reports worsening depressive symptoms since last session two weeks ago despite medication adjustment.")
  • State the primary working diagnosis with full DSM-5 specificity (e.g., "Major Depressive Disorder, recurrent, severe, without psychotic features" not just "Depression").
  • List up to 3 differential diagnoses with brief clinical justification for each.
  • Explicitly state which DSM-5 criteria are being met and which are not (supporting vs. conflicting evidence).
  • For chronic conditions, state whether each is: IMPROVED / STABLE / WORSENED since last encounter.
  • Comment on clinical risk level: low / moderate / high (tie to the Risk section if applicable).
  • Reference the MSE findings to support your formulation (e.g., "Blunted affect and anhedonia noted on MSE are consistent with the severity of the depressive episode.").

[P – PLAN] — Specific, actionable next steps. Each item must be tied to a diagnosis or identified need.
  • Pharmacotherapy: For each medication — drug name, dose, route, frequency, purpose, and change made (new / continue / adjust / discontinue). Include rationale (e.g., "Increasing sertraline from 50mg to 100mg daily due to partial response and worsening PHQ-9 score").
  • Non-pharmacological interventions: Specific therapeutic modalities with frequency (e.g., "Continue weekly CBT sessions targeting cognitive restructuring of catastrophic thinking patterns").
  • Safety planning: If any risk is present, document the specific safety protocol activated (e.g., "Columbia Suicide Severity Rating Scale administered; safety plan updated and reviewed with patient").
  • Patient education: Topics discussed (e.g., "Educated patient on sleep hygiene and circadian rhythm disruption in depression").
  • Referrals: Specialist name, reason, urgency (e.g., "Referral placed to psychiatry for medication evaluation — STAT given severity of symptoms").
  • Labs/Diagnostics: Any ordered tests and clinical rationale (e.g., "TSH ordered to rule out hypothyroidism as contributing factor to fatigue").
  • Follow-up: Specific timeline (e.g., "Return in 2 weeks for medication check-in; sooner if symptoms worsen or safety concerns arise").

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL RULES (apply to all sections)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CITE specific transcript line ranges for EVERY factual claim using "transcript:lines:X-Y". Estimate from content.
2. NEVER fabricate clinical details not present in the transcript. If data is absent, document as "not reported" or "not observed."
3. NEVER place subjective patient reports in the Objective section, and NEVER place clinician MSE observations in the Subjective section.
4. Use formal clinical language (e.g., "anhedonia" not "lack of enjoyment"; "psychomotor retardation" not "moving slowly").
5. Confidence (0–1): Mark ≥0.75 only when transcript clearly and directly supports the claim. Low-evidence sections must score lower.
6. For ${sessionType === 'intake' ? 'intake sessions: document full past medical history, social history, family psychiatric history, and medication history.' : 'follow-up sessions: focus on interval changes, treatment response, and goal progress.'}

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
        ? `\n\nPRIOR SESSION NOTES (for interval history and goal tracking):\n${state.input.priorNotes
            .map((n) => `Session ${n.session}: ${n.soapNote.slice(0, 500)}`)
            .join('\n---\n')}`
        : '';

    const result = await model.invoke([
      {
        role: 'system',
        content: buildSystemPrompt(session.sessionType, clinicianPreferences.noteVerbosity),
      },
      {
        role: 'user',
        content: `PATIENT DEMOGRAPHICS:
Patient ID: ${patient.id} | Age: ${patient.age} | Gender: ${patient.gender}
Known DSM-5 diagnoses: ${patient.knownDiagnoses.join(', ') || 'None on record'}
Current medications: ${patient.currentMedications.join(', ') || 'None on record'}
Session #${session.sessionNumber} | Duration: ${session.durationMinutes} min | Modality: ${session.modality} | Type: ${session.sessionType}
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
