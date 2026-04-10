import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import type { GraphState } from '../graph';
import type { SOAPNote, AssessmentCriteriaRow } from '../types/index';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
// Each helper is a FACTORY (called with ()) so Zod emits inline schemas,
// never $ref/$defs — Gemini's API rejects JSON Schema $ref references.

const makeLevel = () => z.enum(['normal', 'mild', 'moderate', 'severe']);
const makeTrend = () => z.enum(['improved', 'stable', 'worsened', 'no_prior_data']);

const makeBarometer = () =>
  z.object({
    level: makeLevel(),
    description: z.string().describe('Brief clinical description, e.g. "Mildly slowed, cooperative"'),
    trend: makeTrend().describe('Compared to most recent prior session note'),
  });

const makeVitalSigns = () =>
  z.object({
    bloodPressure: z.string().optional().describe('e.g. "128/82 mmHg" — omit if not documented'),
    heartRate: z.string().optional().describe('e.g. "88 bpm" — omit if not documented'),
    weight: z.string().optional().describe('e.g. "72 kg" — omit if not documented'),
    level: makeLevel(),
    trend: makeTrend(),
  });

const makeAssessmentCriteriaRow = () =>
  z.object({
    criterion: z.string().describe('DSM-5 criterion name (concise, e.g. "Depressed mood ≥2 weeks")'),
    evidence: z.string().describe('Verbatim or paraphrased transcript evidence supporting/refuting this criterion'),
    met: z.enum(['yes', 'no', 'partial']),
    changeFromPrior: z.enum(['improved', 'stable', 'worsened', 'new', 'na']).describe('"na" if no prior session data'),
  });

const SubjectiveSchema = z.object({
  content: z.string(),
  confidence: z.number().min(0).max(1),
  sourceCitations: z.array(z.string()),
});

const ObjectiveSchema = z.object({
  content: z.string(),
  confidence: z.number().min(0).max(1),
  sourceCitations: z.array(z.string()),
  barometers: z.object({
    vitalSigns: makeVitalSigns().optional().describe(
      'Only include if vitals are explicitly documented in transcript. For telehealth sessions without vitals, omit this field entirely.',
    ),
    psychomotor: makeBarometer(),
    speech: makeBarometer(),
  }),
});

const AssessmentSchema = z.object({
  content: z.string(),
  confidence: z.number().min(0).max(1),
  sourceCitations: z.array(z.string()),
  criteriaTable: z.array(makeAssessmentCriteriaRow()).describe(
    'DSM-5 criteria evaluation table for the primary working diagnosis. Include all relevant criteria (typically 5-9 rows).',
  ),
});

const PlanSchema = z.object({
  content: z.string(),
  confidence: z.number().min(0).max(1),
  sourceCitations: z.array(z.string()),
});

const SOAPOutputSchema = z.object({
  subjective: SubjectiveSchema,
  objective: ObjectiveSchema,
  assessment: AssessmentSchema,
  plan: PlanSchema,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function criteriaTableToMarkdown(rows: AssessmentCriteriaRow[]): string {
  if (!rows.length) return '';

  const MET_LABELS: Record<string, string> = {
    yes: '✓ Met',
    no: '✗ Not Met',
    partial: '~ Partial',
  };
  const CHANGE_LABELS: Record<string, string> = {
    improved: '↓ Improved',
    stable: '→ Stable',
    worsened: '↑ Worsened',
    new: '★ New',
    na: '— N/A',
  };

  const header = '| DSM-5 Criterion | Evidence | Status | Δ vs Prior |\n|---|---|---|---|';
  const body = rows
    .map(
      (r) =>
        `| ${r.criterion} | ${r.evidence} | ${MET_LABELS[r.met] ?? r.met} | ${CHANGE_LABELS[r.changeFromPrior] ?? r.changeFromPrior} |`,
    )
    .join('\n');

  return `\n\n---\n\n**DSM-5 Criteria Evaluation**\n\n${header}\n${body}`;
}

// ─── System Prompt ─────────────────────────────────────────────────────────────

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

  BAROMETERS (structured fields — required):
  You MUST also populate the barometers object:
  - vitalSigns: ONLY include if vitals (BP, HR, or weight) are explicitly stated in the transcript. For telehealth/virtual sessions without documented vitals, OMIT this field entirely. Do not guess or fabricate.
  - psychomotor: Classify Behaviour/Psychomotor level as one of: normal | mild | moderate | severe.
    Compare against prior session notes to determine trend: improved | stable | worsened | no_prior_data.
  - speech: Classify Speech level as one of: normal | mild | moderate | severe.
    Compare against prior session notes to determine trend.

[A – ASSESSMENT] — Clinical formulation and diagnostic reasoning.
  • For follow-up sessions: Begin with an Interval History statement — how is the patient's condition since the last encounter?
  • State the primary working diagnosis with full DSM-5 specificity.
  • List up to 3 differential diagnoses with brief clinical justification for each.
  • Explicitly state which DSM-5 criteria are being met and which are not.
  • For chronic conditions, state whether each is: IMPROVED / STABLE / WORSENED since last encounter.
  • Comment on clinical risk level: low / moderate / high.
  • Reference the MSE findings to support your formulation.

  CRITERIA TABLE (structured fields — required):
  You MUST populate criteriaTable with a row for each relevant DSM-5 criterion for the PRIMARY working diagnosis.
  - Include all applicable criteria (typically 5-9 rows for MDD, Bipolar, etc.)
  - evidence: quote or paraphrase specific transcript support
  - met: 'yes' | 'no' | 'partial'
  - changeFromPrior: compare to prior notes if available, else 'na'

[P – PLAN] — Specific, actionable next steps. Each item MUST be tied to a diagnosis or identified need.
  FORMAT RULE (strictly required): Write EVERY plan item as a numbered markdown list entry:
    1. **[Category]**: [Full description of action]  [Target: symptom/problem addressed]  [Timeframe: when/how often]

  Categories to cover (use exactly these labels):
  • **Pharmacotherapy**: drug name, dose, route, frequency, purpose, and change made (e.g., NEW / CONTINUED / DOSE ADJUSTED)
  • **Psychotherapy**: modality, frequency, focus and rationale
  • **Safety Planning**: if any risk present — specific protocol, contacted persons, follow-up check
  • **Patient Education**: exact topics reviewed
  • **Referrals**: specialist, reason, urgency
  • **Labs/Diagnostics**: test name, clinical rationale, timeframe
  • **Follow-up**: exact date/days, conditions for earlier contact

  Example format:
  1. **Pharmacotherapy**: Sertraline 50 mg PO QD — initiate today; titrate to 100 mg at week 2 if tolerated.  [Target: Major Depressive Disorder, insomnia]  [Timeframe: Start immediately]
  2. **Psychotherapy**: CBT, weekly 50-min sessions × 12 weeks; focus on cognitive restructuring and behavioral activation.  [Target: Depressive cognitions, social withdrawal]  [Timeframe: Begin next session]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL RULES (apply to all sections)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CITE specific transcript line ranges for EVERY factual claim using "transcript:lines:X-Y".
2. NEVER fabricate clinical details not present in the transcript. If data is absent, document as "not reported" or "not observed."
3. NEVER place subjective patient reports in the Objective section, and vice versa.
4. Use formal clinical language.
5. Confidence (0–1): Mark ≥0.75 only when transcript clearly and directly supports the claim.
6. For ${sessionType === 'intake' ? 'intake sessions: document full past medical history, social history, family psychiatric history, and medication history.' : 'follow-up sessions: focus on interval changes, treatment response, and goal progress.'}

Return structured JSON only.`;
}

// ─── Node ─────────────────────────────────────────────────────────────────────

export async function soapNode(state: GraphState): Promise<Partial<GraphState>> {
  try {
    const { session, patient, clinicianPreferences } = state.input;

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0.2,
    }).withStructuredOutput(SOAPOutputSchema);

    const priorContext =
      state.input.priorNotes.length > 0
        ? `\n\nPRIOR SESSION NOTES (for barometer trend comparison and interval history):\n${state.input.priorNotes
            .map((n) => `Session ${n.session}: ${n.soapNote.slice(0, 600)}`)
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
      if ((raw as any).confidence < 0.75) lowConfidenceSections.push(key as string);
      return {
        content: (raw as any).content,
        confidence: (raw as any).confidence,
        sourceCitations: (raw as any).sourceCitations,
        status: 'draft' as const,
        revisionRounds: 0,
        provenanceTag: 'ai_drafted' as const,
      };
    };

    // Append criteria table as markdown to assessment content
    const assessmentMarkdownSuffix = criteriaTableToMarkdown(result.assessment.criteriaTable);

    const soapNote: SOAPNote = {
      subjective: toSection('subjective', result.subjective),
      objective: {
        ...toSection('objective', result.objective),
        barometers: result.objective.barometers,
      },
      assessment: {
        ...toSection('assessment', result.assessment),
        content: result.assessment.content + assessmentMarkdownSuffix,
        criteriaTable: result.assessment.criteriaTable as AssessmentCriteriaRow[],
      },
      plan: toSection('plan', result.plan),
    };

    return {
      soapNote,
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'soap',
          action: 'ai_generated',
          details: `Low confidence sections: ${lowConfidenceSections.join(', ') || 'none'} | Barometers: psychomotor=${result.objective.barometers.psychomotor.level}, speech=${result.objective.barometers.speech.level} | Criteria table: ${result.assessment.criteriaTable.length} rows`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `SOAP_AGENT_ERROR: ${message}` };
  }
}
