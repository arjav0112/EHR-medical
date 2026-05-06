import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Tool 8 — Drug Interaction Checker
 * Queries the OpenFDA drug label API for known interactions between
 * medications in a patient's current list.
 * Use whenever a new medication is being added to an existing regimen.
 */
export const drugInteractionTool = tool(
  async ({ medications }) => {
    if (medications.length < 2) {
      return JSON.stringify({
        interactions: [],
        message: 'Need at least 2 medications to check interactions',
      });
    }

    try {
      const apiKey = process.env.OPENFDA_API_KEY;
      const keyParam = apiKey ? `&api_key=${apiKey}` : '';
      const results: Array<{
        medication: string;
        known_interactions: string;
        source: string;
      }> = [];

      for (const med of medications) {
        // Rate-limit courtesy between requests
        await new Promise((r) => setTimeout(r, 200));

        const res = await fetch(
          `https://api.fda.gov/drug/label.json?search=openfda.generic_name:${encodeURIComponent(med)}+AND+drug_interactions:*&limit=1${keyParam}`,
          { signal: AbortSignal.timeout(8000) }
        );

        if (!res.ok) continue;

        const data = (await res.json()) as {
          results?: Array<{ drug_interactions?: string[] }>;
          error?: { message: string };
        };

        if (data.error) continue;

        const interactions = data.results?.[0]?.drug_interactions?.[0] ?? null;
        if (interactions) {
          results.push({
            medication: med,
            known_interactions: interactions.slice(0, 500),
            source: 'openFDA drug label',
          });
        }
      }

      return JSON.stringify({
        medications_checked: medications,
        interactions_found: results.length,
        interactions: results,
        note:
          results.length === 0
            ? 'No interactions found in FDA labels — does not exclude all interactions; always verify clinically'
            : undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({
        error: 'Drug interaction check failed',
        message: msg,
        medications,
      });
    }
  },
  {
    name: 'drug_interaction_check',
    description:
      "Check known drug-drug interactions for a patient's medication list using FDA drug labels. Use when a new medication is recommended or when medication compliance changes (e.g., patient stopped one drug). Returns interaction text from official FDA labels.",
    schema: z.object({
      medications: z
        .array(z.string())
        .min(2)
        .describe(
          "Array of ≥2 medication names to check e.g. ['sertraline', 'lorazepam', 'lithium']"
        ),
    }),
  }
);
