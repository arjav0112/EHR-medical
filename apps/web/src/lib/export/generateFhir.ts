import type { ReviewPackage } from 'agents';

/**
 * Generates a FHIR R4 DocumentReference from an approved ReviewPackage.
 * Each SOAP section is base64-encoded as a separate attachment.
 */
export function generateFhirDocumentReference(reviewPackage: ReviewPackage): object {
  const { soapNote, sessionId } = reviewPackage;

  const toBase64 = (text: string): string => {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(text, 'utf-8').toString('base64');
    }
    // Browser fallback
    return btoa(unescape(encodeURIComponent(text)));
  };

  const sections = [
    { title: 'Subjective', content: soapNote.subjective?.content ?? '' },
    { title: 'Objective', content: soapNote.objective?.content ?? '' },
    { title: 'Assessment', content: soapNote.assessment?.content ?? '' },
    { title: 'Plan', content: soapNote.plan?.content ?? '' },
  ];

  return {
    resourceType: 'DocumentReference',
    id: sessionId,
    meta: {
      lastUpdated: new Date().toISOString(),
      tag: [
        { system: 'https://ehr-copilot.dev/audit', code: 'ai-assisted', display: 'AI-Assisted Documentation' },
        { system: 'https://ehr-copilot.dev/audit', code: 'clinician-reviewed', display: 'Clinician Reviewed & Approved' },
      ],
    },
    status: 'current',
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '11506-3',
          display: 'Progress note',
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: 'http://loinc.org',
            code: '34117-2',
            display: 'History & Physical Note',
          },
        ],
      },
    ],
    date: new Date().toISOString(),
    description: `EHR Copilot clinical note — session ${sessionId}`,
    content: sections.map(({ title, content }) => ({
      attachment: {
        contentType: 'text/plain',
        language: 'en-US',
        data: toBase64(content),
        title,
        creation: new Date().toISOString(),
      },
    })),
    context: {
      event: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
              code: 'PSYCHTHER',
              display: 'Psychotherapy session',
            },
          ],
        },
      ],
    },
    extension: [
      {
        url: 'https://ehr-copilot.dev/fhir/StructureDefinition/overall-risk-level',
        valueString: reviewPackage.overallRiskLevel,
      },
      {
        url: 'https://ehr-copilot.dev/fhir/StructureDefinition/transcript-quality-score',
        valueDecimal: reviewPackage.agentMetadata.transcriptQualityScore,
      },
      {
        url: 'https://ehr-copilot.dev/fhir/StructureDefinition/confirmed-risk-flags',
        valueInteger: reviewPackage.riskFlags.filter((f) => f.status === 'confirmed').length,
      },
    ],
  };
}
