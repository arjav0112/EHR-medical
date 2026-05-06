import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Expected clinical elements per SOAP section.
 * Partial match against these is the "clinical completeness" dimension.
 */
const SECTION_EXPECTED_ELEMENTS: Record<string, string[]> = {
  subjective: ['mood', 'sleep', 'appetite', 'functioning', 'suicid', 'complaint', 'report'],
  objective: ['affect', 'eye contact', 'speech', 'thought', 'insight', 'judgment', 'cognit'],
  assessment: ['diagnosis', 'criteria', 'severity', 'dsm', 'differential', 'evidence'],
  plan: ['intervention', 'follow', 'session', 'goal', 'medication', 'referral', 'safety'],
};

/**
 * Tool 5 — Confidence Scorer
 * Computes a 0-1 confidence score for a generated SOAP section across
 * three dimensions: citation coverage, transcript grounding, and clinical
 * completeness. Sections <0.75 must be flagged as low_confidence.
 */
export const confidenceScorerTool = tool(
  async ({ section, content, transcript, citations }) => {
    const contentLower = content.toLowerCase();
    const transcriptLower = transcript.toLowerCase();

    // ── 1. Citation coverage (weight 0.30) ──────────────────────────────────
    const citationScore =
      citations.length >= 3 ? 1.0
      : citations.length === 2 ? 0.75
      : citations.length === 1 ? 0.50
      : 0.10;

    // ── 2. Transcript grounding (weight 0.40) ────────────────────────────────
    // Ratio of meaningful content words that appear in the transcript
    const contentWords = content
      .split(/\W+/)
      .filter((w) => w.length > 4 && !/^\d+$/.test(w));
    const groundedWords = contentWords.filter((w) =>
      transcriptLower.includes(w.toLowerCase())
    );
    const groundingScore =
      contentWords.length > 0 ? groundedWords.length / contentWords.length : 0;

    // ── 3. Clinical completeness (weight 0.30) ───────────────────────────────
    const expected = SECTION_EXPECTED_ELEMENTS[section] ?? [];
    const coveredElements = expected.filter((el) => contentLower.includes(el));
    const completenessScore =
      expected.length > 0 ? coveredElements.length / expected.length : 0.8;

    const finalScore =
      Math.round(
        (citationScore * 0.3 + groundingScore * 0.4 + completenessScore * 0.3) * 100
      ) / 100;

    // ── Collect warnings ─────────────────────────────────────────────────────
    const warnings: string[] = [];
    if (citationScore < 0.5)
      warnings.push('Insufficient citations — add transcript:lines:X-Y references');
    if (groundingScore < 0.5)
      warnings.push('Low transcript grounding — content may not reflect this session');
    if (completenessScore < 0.6) {
      const missing = expected.filter((el) => !contentLower.includes(el));
      warnings.push(`Missing clinical elements: ${missing.join(', ')}`);
    }

    return JSON.stringify({
      score: finalScore,
      breakdown: {
        citation_coverage: Math.round(citationScore * 100) / 100,
        transcript_grounding: Math.round(groundingScore * 100) / 100,
        clinical_completeness: Math.round(completenessScore * 100) / 100,
      },
      low_confidence: finalScore < 0.75,
      warnings,
    });
  },
  {
    name: 'confidence_scorer',
    description:
      'Score the quality and transcript-grounding of a generated SOAP section. Returns 0-1 score with breakdown by citation coverage, grounding, and completeness. Sections below 0.75 must be flagged as low_confidence in the final output.',
    schema: z.object({
      section: z
        .enum(['subjective', 'objective', 'assessment', 'plan'])
        .describe('Which SOAP section to score'),
      content: z.string().describe('The generated section content'),
      transcript: z.string().describe('Full session transcript'),
      citations: z
        .array(z.string())
        .describe('Citation strings already found for this section e.g. ["transcript:lines:12-14"]'),
    }),
  }
);
