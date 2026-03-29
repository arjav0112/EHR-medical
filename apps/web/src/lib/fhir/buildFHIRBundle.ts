import type { ReviewPackage } from 'agents';

// ─── FHIR R4 Types (minimal) ──────────────────────────────────────────────────

interface FHIRCoding {
  system: string;
  code: string;
  display?: string;
}

interface FHIRCodeableConcept {
  coding: FHIRCoding[];
  text?: string;
}

interface FHIRReference {
  reference: string;
  display?: string;
}

interface FHIRAnnotation {
  text: string;
  time?: string;
}

interface FHIRCondition {
  resourceType: 'Condition';
  id: string;
  meta: { profile: string[] };
  clinicalStatus: FHIRCodeableConcept;
  verificationStatus: FHIRCodeableConcept;
  category: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  note?: FHIRAnnotation[];
  evidence?: Array<{ detail: FHIRReference[] }>;
}

interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  status: 'final' | 'preliminary';
  category: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  effectiveDateTime: string;
  valueString: string;
  note?: FHIRAnnotation[];
}

interface FHIRDocumentReference {
  resourceType: 'DocumentReference';
  id: string;
  meta: { profile: string[]; lastUpdated: string };
  status: 'current';
  type: FHIRCodeableConcept;
  category: FHIRCodeableConcept[];
  subject: FHIRReference;
  date: string;
  description: string;
  content: Array<{
    attachment: {
      contentType: string;
      data: string;
      title: string;
      creation: string;
    };
  }>;
  context?: {
    event?: FHIRCodeableConcept[];
    related?: FHIRReference[];
  };
  extension?: Array<{ url: string; valueString?: string; valueDecimal?: number }>;
}

interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  meta: {
    profile: string[];
    lastUpdated: string;
    tag: Array<{ system: string; code: string; display: string }>;
  };
  type: 'document';
  timestamp: string;
  entry: Array<{ resource: FHIRCondition | FHIRObservation | FHIRDocumentReference }>;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

const SNOMED = 'http://snomed.info/sct';
const LOINC = 'http://loinc.org';
const HL7_OBS_CAT = 'http://terminology.hl7.org/CodeSystem/observation-category';
const EHR_COPILOT_EXT = 'https://ehr-copilot.dev/fhir/StructureDefinition';

export function buildFHIRBundle(
  reviewPackage: ReviewPackage,
  patientId: string,
  sessionId: string
): FHIRBundle {
  const now = new Date().toISOString();
  const { soapNote, riskFlags, diagnosisSuggestions, auditLog } = reviewPackage;

  const entries: FHIRBundle['entry'] = [];

  // ── 1. Main DocumentReference — full SOAP note ────────────────────────────
  const soapText = [
    `SUBJECTIVE:\n${soapNote.subjective?.content ?? ''}`,
    `OBJECTIVE:\n${soapNote.objective?.content ?? ''}`,
    `ASSESSMENT:\n${soapNote.assessment?.content ?? ''}`,
    `PLAN:\n${soapNote.plan?.content ?? ''}`,
  ].join('\n\n');

  const docRef: FHIRDocumentReference = {
    resourceType: 'DocumentReference',
    id: `docref-${sessionId}`,
    meta: {
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference'],
      lastUpdated: now,
    },
    status: 'current',
    type: {
      coding: [{ system: LOINC, code: '11506-3', display: 'Progress note' }],
    },
    category: [
      {
        coding: [{ system: LOINC, code: '34117-2', display: 'History & Physical Note' }],
      },
    ],
    subject: { reference: `Patient/${patientId}` },
    date: now,
    description: 'AI-assisted SOAP note — reviewed and approved by clinician',
    content: [
      {
        attachment: {
          contentType: 'text/plain',
          data: Buffer.from(soapText).toString('base64'),
          title: `SOAP Note — Session ${sessionId}`,
          creation: now,
        },
      },
    ],
    extension: [
      {
        url: `${EHR_COPILOT_EXT}/session-id`,
        valueString: sessionId,
      },
      {
        url: `${EHR_COPILOT_EXT}/transcript-quality-score`,
        valueDecimal: reviewPackage.agentMetadata.transcriptQualityScore,
      },
      {
        url: `${EHR_COPILOT_EXT}/processing-time-ms`,
        valueDecimal: reviewPackage.agentMetadata.processingTimeMs,
      },
      {
        url: `${EHR_COPILOT_EXT}/audit-entry-count`,
        valueDecimal: auditLog.length,
      },
    ],
  };
  entries.push({ resource: docRef });

  // ── 2. Observations — one per SOAP section with confidence ────────────────
  for (const [key, label, loincCode] of [
    ['subjective', 'Subjective', '10164-2'],
    ['objective', 'Objective', '10210-3'],
    ['assessment', 'Assessment', '51848-0'],
    ['plan', 'Plan', '18776-5'],
  ] as const) {
    const sec = soapNote[key as keyof typeof soapNote];
    if (!sec) continue;
    const obs: FHIRObservation = {
      resourceType: 'Observation',
      id: `obs-${key}-${sessionId}`,
      status: sec.status === 'approved' ? 'final' : 'preliminary',
      category: [
        {
          coding: [{ system: HL7_OBS_CAT, code: 'clinical-note' }],
        },
      ],
      code: {
        coding: [{ system: LOINC, code: loincCode, display: label }],
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: now,
      valueString: sec.content,
      note: [
        {
          text: `Confidence: ${Math.round(sec.confidence * 100)}% | Provenance: ${sec.provenanceTag} | Revisions: ${sec.revisionRounds}`,
          time: now,
        },
      ],
    };
    entries.push({ resource: obs });
  }

  // ── 3. Conditions — one per confirmed diagnosis suggestion ────────────────
  for (const dx of diagnosisSuggestions) {
    const confidence = dx.confidence;
    const condVerif =
      confidence >= 0.8
        ? { code: 'confirmed', display: 'Confirmed' }
        : { code: 'provisional', display: 'Provisional' };

    const condition: FHIRCondition = {
      resourceType: 'Condition',
      id: `cond-${dx.dsm5Code.replace('.', '-')}-${sessionId}`,
      meta: {
        profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition'],
      },
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active',
            display: 'Active',
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            ...condVerif,
          },
        ],
      },
      category: [
        {
          coding: [
            {
              system: SNOMED,
              code: '394814009',
              display: 'General practice',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://hl7.org/fhir/sid/icd-10-cm',
            code: dx.dsm5Code,
            display: dx.label,
          },
        ],
        text: dx.label,
      },
      subject: { reference: `Patient/${patientId}` },
      note: dx.supportingCriteria.length
        ? [{ text: `Supporting: ${dx.supportingCriteria.join('; ')}`, time: now }]
        : undefined,
    };
    entries.push({ resource: condition });
  }

  // ── 4. Risk flag observations ─────────────────────────────────────────────
  const confirmedFlags = riskFlags.filter((f) => f.status === 'confirmed');
  for (const [i, flag] of confirmedFlags.entries()) {
    const obs: FHIRObservation = {
      resourceType: 'Observation',
      id: `risk-obs-${i}-${sessionId}`,
      status: 'final',
      category: [
        {
          coding: [{ system: HL7_OBS_CAT, code: 'social-history' }],
        },
      ],
      code: {
        coding: [
          {
            system: SNOMED,
            code: '225338004',
            display: 'Risk assessment',
          },
        ],
        text: flag.type.replace(/_/g, ' '),
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: now,
      valueString: flag.evidence,
      note: [
        {
          text: `Severity: ${flag.severity} | Immediate: ${flag.requiresImmediateAction} | Protocol: ${flag.protocolTriggered || 'none'} | Location: ${flag.transcriptLocation}`,
          time: now,
        },
      ],
    };
    entries.push({ resource: obs });
  }

  return {
    resourceType: 'Bundle',
    id: `bundle-${sessionId}`,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'],
      lastUpdated: now,
      tag: [
        {
          system: 'https://ehr-copilot.dev/fhir/tags',
          code: 'ai-assisted',
          display: 'AI-Assisted Clinical Documentation',
        },
      ],
    },
    type: 'document',
    timestamp: now,
    entry: entries,
  };
}
