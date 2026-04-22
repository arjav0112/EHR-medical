import type { ReviewPackage } from 'agents';

// ─── Synthetic transcript (50 lines, no real PHI) ─────────────────────────────

const DEMO_TRANSCRIPT = `
Clinician: Good afternoon. How have things been since we last spoke?
Patient: Honestly, it's been a rough couple of weeks. I've been sleeping a lot more than usual.
Clinician: Tell me more about the sleep. Are you sleeping too much, or is it hard to get up?
Patient: Both, I think. I sleep nine, ten hours and still feel exhausted.
Clinician: How about your energy levels during the day?
Patient: Pretty low. I've been cancelling plans with friends. I just don't have the motivation.
Clinician: Have you been keeping up with your medication?
Patient: Not really. I ran out last week and haven't gotten to the pharmacy yet.
Clinician: I see. Has that affected your mood?
Patient: I think so. I've been feeling more hopeless than usual.
Clinician: When you say hopeless, can you say more about that? Are you having any thoughts of hurting yourself?
Patient: Sometimes I think about not being here. Nothing specific, just... the thought crosses my mind.
Clinician: I hear you. Do you have any plan or intent to act on those thoughts?
Patient: No, nothing like that. It's more like I'm just tired.
Clinician: That's important to understand. Thank you for telling me. How often are those thoughts occurring?
Patient: Maybe two or three times a week. Usually at night.
Clinician: Any triggers you've noticed?
Patient: Being alone mostly. When I'm busy it's easier.
Clinician: Have you been able to use any of the strategies we worked on — the behavioral activation schedule?
Patient: A little. I went for a walk twice this week, which is more than last week.
Clinician: That's meaningful progress. How did you feel after the walks?
Patient: Better, temporarily. Maybe an hour or two of feeling okay.
Clinician: That's your window. We can use that. What else has been going on socially?
Patient: Not much. I had dinner with my sister on Sunday. She noticed something was off.
Clinician: Did that feel supportive or uncomfortable?
Patient: Supportive, actually. She didn't push, just listened.
Clinician: Good. I want to revisit the medication situation. For your safety, can we contact the pharmacy together?
Patient: Yes, that would help. I think I just needed someone to prompt me.
Clinician: Understood. Let's also revise our safety plan given the passive ideation you mentioned.
Patient: Okay. I think I need to update my crisis contacts list too.
Clinician: Agreed. I'll note that for your plan. How's your appetite been?
Patient: Poor. I eat maybe one real meal a day.
Clinician: That's significantly less than before. Anything in particular putting you off eating?
Patient: No appetite. Nothing sounds appealing.
Clinician: Are there foods that feel easier to manage — things that are quick and don't require cooking?
Patient: Fruit, maybe. Crackers. Low effort stuff.
Clinician: Let's build that into the plan as well. I want to check in more frequently for a bit.
Patient: I think that would help. Maybe two times a week for a few weeks?
Clinician: Absolutely. I'll schedule that after today. Anything else weighing on you?
Patient: Work has been stressful. My manager said my performance has slipped.
Clinician: How long has that been going on?
Patient: About a month. Since the episode started.
Clinician: That timeline makes sense. Has your workplace been informed of anything?
Patient: No. I'd like to keep it private if possible.
Clinician: Of course. We'll keep it confidential. Is there anything you'd like to take away from today's session to focus on?
Patient: Getting my medication. Calling my crisis contact. And maybe the walks.
Clinician: Those three things are exactly right. Let's make that the plan for this week.
Patient: Thank you. This helped more than I expected.
Clinician: I'm glad. Take care of yourself, and I'll see you Thursday.
`.trim();

// ─── Demo ReviewPackage ────────────────────────────────────────────────────────

export const demoReviewPackage: ReviewPackage = {
  sessionId: 'demo',
  reviewStatus: 'pending_clinician_review',
  overallRiskLevel: 'moderate',

  riskFlags: [
    {
      type: 'suicidal_ideation',
      severity: 'moderate',
      evidence: 'Sometimes I think about not being here. Nothing specific, just... the thought crosses my mind.',
      transcriptLocation: 'lines:12-13',
      protocolTriggered: 'Passive ideation protocol — safety plan review required',
      requiresImmediateAction: false,
      status: 'pending',
    },
    {
      type: 'medication_noncompliance',
      severity: 'low',
      evidence: 'Not really. I ran out last week and haven\'t gotten to the pharmacy yet.',
      transcriptLocation: 'lines:8-9',
      protocolTriggered: 'Medication management review',
      requiresImmediateAction: false,
      status: 'pending',
    },
    {
      type: 'self_harm',
      severity: 'high',
      evidence: 'I\'ve been feeling more hopeless than usual. Sometimes I just don\'t see the point of continuing.',
      transcriptLocation: 'lines:15-16',
      protocolTriggered: 'High-risk ideation protocol — escalate to duty clinician',
      requiresImmediateAction: true,
      status: 'pending',
    },
  ],

  soapNote: {
    subjective: {
      content: `Patient presents with worsening depressive symptoms over the past two weeks. Reports hypersomnia (9–10 hours/night) with persistent fatigue, low motivation, and social withdrawal, including cancellation of plans with friends. Appetite significantly reduced (approximately one meal per day). Patient endorsed passive suicidal ideation occurring 2–3 times per week, primarily at night when alone, with no plan or intent. Patient reports medication lapse (ran out of sertraline one week ago, has not refilled). Stressor identified: occupational performance feedback from manager, ongoing for approximately one month. Protective factors: supportive sibling contact (dinner on Sunday), patient insight, willingness to engage in treatment, successful use of behavioral activation (two walks this week).`,
      confidence: 0.88,
      sourceCitations: ['transcript:lines:1-50', 'transcript:lines:12-14', 'transcript:lines:31-35'],
      status: 'draft',
      revisionRounds: 0,
      provenanceTag: 'ai_drafted',
    },
    objective: {
      content: `Patient attended session on time via telehealth. Affect flat to mildly dysphoric; mood self-reported as low. Speech rate normal, volume appropriate. No psychomotor agitation or retardation observed. Thought process linear and goal-directed. No evidence of psychosis. Cognitive functioning appears intact; patient demonstrated insight and was able to articulate goals clearly. Safety: passive suicidal ideation present, no plan or intent. MSE otherwise within normal limits.`,
      confidence: 0.82,
      sourceCitations: ['transcript:lines:1-8', 'transcript:lines:12-16'],
      status: 'draft',
      revisionRounds: 0,
      provenanceTag: 'ai_drafted',
    },
    assessment: {
      content: `Patient is a 34-year-old presenting with a moderate major depressive episode (F32.1), consistent with recurrent depressive disorder. Current episode is notable for neurovegetative features (hypersomnia, appetite loss, fatigue), passive suicidal ideation, and social/occupational impairment. Medication non-compliance over the past week is a contributing factor to symptom worsening. Risk stratification: moderate — passive ideation without plan; mitigated by protective factors including patient insight, supportive social network, and active engagement in therapy. Safety plan requires updating. Behavioral activation showing early positive response.`,
      confidence: 0.79,
      sourceCitations: ['transcript:lines:8-14', 'transcript:lines:39-45'],
      status: 'draft',
      revisionRounds: 0,
      provenanceTag: 'ai_drafted',
    },
    plan: {
      content: `1. **Medication**: Facilitate pharmacy contact during session to address sertraline refill (patient consented). Monitor adherence at next appointment.
2. **Safety plan**: Update safety plan to include current passive ideation frequency, updated crisis contacts list, and coping strategies for nighttime ideation (patient identified isolation as trigger).
3. **Behavioral activation**: Continue structured activity scheduling; reinforce walk routine (2x this week noted as success). Add low-effort nutritional goals (fruit, crackers) given appetite suppression.
4. **Session frequency**: Increase to 2x/week for the next 3 weeks to support monitoring during worsening episode.
5. **Occupational support**: Patient wishes to maintain confidentiality at work; no immediate employer contact warranted. Revisit if impairment worsens.
6. **Follow-up**: Thursday (3 days). Review medication adherence, safety plan effectiveness, and activity log.`,
      confidence: 0.91,
      sourceCitations: ['transcript:lines:27-50'],
      status: 'draft',
      revisionRounds: 0,
      provenanceTag: 'ai_drafted',
    },
  },

  diagnosisSuggestions: [
    {
      dsm5Code: 'F32.1',
      label: 'Major Depressive Disorder, Moderate (F32.1)',
      confidence: 0.91,
      supportingCriteria: [
        'Depressed mood most of the day',
        'Hypersomnia',
        'Fatigue and loss of energy',
        'Diminished interest in activities',
        'Recurrent thoughts of death (passive)',
        'Appetite disturbance',
      ],
      conflictingSignals: ['No manic episodes identified', 'Substance use not assessed this session'],
      priorDiagnosisMatch: true,
      intervalStatus: 'worsened',
    },
  ],

  treatmentPlan: {
    currentGoalsProgress: [
      {
        goal: 'Increase behavioral activation (3+ activities/week)',
        status: 'in_progress',
        evidenceFromSession: 'Patient reports 2 walks this week — modest but meaningful improvement',
      },
      {
        goal: 'Maintain medication adherence (sertraline 50mg daily)',
        status: 'stalled',
        evidenceFromSession: 'Medication lapse of 1 week — pharmacy contact facilitated in session',
      },
    ],
    newInterventions: [
      'Update safety plan — add passive ideation tracking log',
      'Low-effort nutrition plan for appetite suppression',
      'Reinforce sibling as support contact in crisis plan',
    ],
    nextSessionFocus: 'Medication adherence check-in, safety plan review, behavioral activation log',
    referrals: [],
  },

  agentMetadata: {
    processingTimeMs: 4200,
    transcriptQualityScore: 0.87,
    agentsInvoked: ['transcriptQuality', 'soap', 'risk', 'dsm', 'plan'],
    lowConfidenceSections: [],
  },

  auditLog: [
    { timestamp: new Date().toISOString(), section: 'system', action: 'ai_generated', details: 'Demo mode — synthetic data' },
    { timestamp: new Date().toISOString(), section: 'risk_flags', action: 'ai_generated', details: '2 flags' },
    { timestamp: new Date().toISOString(), section: 'subjective', action: 'ai_generated' },
    { timestamp: new Date().toISOString(), section: 'objective', action: 'ai_generated' },
    { timestamp: new Date().toISOString(), section: 'assessment', action: 'ai_generated' },
    { timestamp: new Date().toISOString(), section: 'plan', action: 'ai_generated' },
  ],
};

export const demoTranscript = DEMO_TRANSCRIPT;
