import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { loadDSM5Criteria, getICD10Label } from '../data';

/**
 * Tool 1 — DSM-5 Lookup
 * Retrieves full diagnostic criteria, specifiers, exclusions, and severity
 * levels for an ICD-10 code. Searches by exact or prefix match.
 */
export const dsm5LookupTool = tool(
  async ({ code }) => {
    const criteria = loadDSM5Criteria();
    const normalizedCode = code.trim().toUpperCase();

    // Try exact match on the code field (which may contain "/" e.g. "F32/F33")
    const exact = criteria.find(
      (d) =>
        d.code.toUpperCase() === normalizedCode ||
        d.code.toUpperCase().split('/').includes(normalizedCode)
    );

    if (exact) return JSON.stringify(exact);

    // Prefix match — e.g. "F32" matches "F32.0", "F32.1", etc.
    const prefix = criteria.find((d) =>
      d.code
        .toUpperCase()
        .split('/')
        .some((c) => c.startsWith(normalizedCode) || normalizedCode.startsWith(c))
    );

    if (prefix) return JSON.stringify(prefix);

    // Not in local dataset — return ICD-10 label if available
    const label = getICD10Label(code);
    return JSON.stringify({
      error: 'Full criteria not in local dataset',
      code,
      label: label ?? 'Unknown code',
      note: 'Use clinical knowledge for this code — dataset contains most common disorders only',
    });
  },
  {
    name: 'dsm5_lookup',
    description:
      'Look up DSM-5 diagnostic criteria, specifiers, severity levels, and rule-out notes for an ICD-10 code like F32.1. Always call this before suggesting any diagnosis.',
    schema: z.object({
      code: z.string().describe('ICD-10 or DSM-5 code e.g. F32.1 or F41.1'),
    }),
  }
);
