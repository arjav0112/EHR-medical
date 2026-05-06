import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { loadICD10Index } from '../data';

/**
 * Tool 2 — ICD-10 Search
 * Full-text search over the local ICD-10-CM psychiatric index.
 * Supports code lookup ("F32.1") and label search ("major depressive").
 */
export const icd10SearchTool = tool(
  async ({ query }) => {
    const index = loadICD10Index();
    const q = query.toLowerCase().trim();

    // 1. Exact code match (highest priority)
    const exact = index.find((e) => e.code.toLowerCase() === q);
    if (exact) return JSON.stringify([exact]);

    // 2. Partial matches across code, description, and tags
    const matches = index
      .filter(
        (e) =>
          e.code.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 5);

    if (matches.length) {
      return JSON.stringify(
        matches.map((m) => ({
          code: m.code,
          description: m.description,
          summary: m.content.slice(0, 200),
          tags: m.tags,
        }))
      );
    }

    return JSON.stringify({ error: 'No matches found', query });
  },
  {
    name: 'icd10_search',
    description:
      "Search ICD-10-CM mental health codes by code or text description. Returns up to 5 matches with code, label, and clinical summary. Use to confirm billing codes or find the correct code for a diagnosis.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "ICD-10 code like 'F32.1' or search term like 'major depressive' or 'PTSD'"
        ),
    }),
  }
);
