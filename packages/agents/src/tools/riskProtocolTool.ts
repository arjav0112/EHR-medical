import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { loadRiskScales } from '../data';

/** Maps risk flag types to the appropriate clinical assessment scale */
const FLAG_TO_SCALE: Record<string, string> = {
  suicidal_ideation: 'c_ssrs',
  self_harm: 'c_ssrs',
  homicidal_ideation: 'c_ssrs',
  depression_symptoms: 'phq9',
  anxiety_symptoms: 'gad7',
  ptsd: 'pcl5',
  medication_noncompliance: 'c_ssrs',
};

/**
 * Tool 3 — Risk Protocol Lookup
 * Returns the full clinical assessment protocol for a given risk flag type,
 * including scale questions, scoring thresholds, severity levels, and
 * mandatory follow-up actions.
 */
export const riskProtocolTool = tool(
  async ({ flag_type }) => {
    const scales = loadRiskScales();
    const scaleKey = FLAG_TO_SCALE[flag_type];

    if (!scaleKey || !scales.scales[scaleKey]) {
      return JSON.stringify({
        error: 'No protocol found for flag type',
        flag_type,
        available_types: Object.keys(FLAG_TO_SCALE),
      });
    }

    const scale = scales.scales[scaleKey];
    return JSON.stringify({
      flag_type,
      scale_used: scale.acronym,
      scale_name: scale.name,
      purpose: scale.purpose,
      severity_levels: scale.severity_mapping,
      required_documentation: (scale as Record<string, unknown>)['required_documentation'] ?? [],
      legal_note: (scale as Record<string, unknown>)['legal_note'] ?? null,
      question_count: scale.questions.length,
    });
  },
  {
    name: 'risk_protocol_lookup',
    description:
      'Get the full clinical assessment protocol for a risk flag type. Returns scale questions, scoring thresholds, severity mapping, and required follow-up actions. Always call this when creating a risk flag.',
    schema: z.object({
      flag_type: z
        .enum([
          'suicidal_ideation',
          'self_harm',
          'homicidal_ideation',
          'depression_symptoms',
          'anxiety_symptoms',
          'ptsd',
          'medication_noncompliance',
        ])
        .describe('Risk flag type to look up protocol for'),
    }),
  }
);
