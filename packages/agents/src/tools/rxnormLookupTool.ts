import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getMedicationInfo } from '../data';

/**
 * Tool 7 — RxNorm / Drug Info Lookup
 * Fast path: searches local drug_labels.json dataset.
 * Fallback: queries the public NLM RxNav API (no key required) for
 * medications not in the local dataset.
 */
export const rxnormLookupTool = tool(
  async ({ medication_name }) => {
    // ── Fast path: local drug_labels dataset ────────────────────────────────
    const local = getMedicationInfo(medication_name);
    if (local) {
      return JSON.stringify({
        source: 'local_dataset',
        generic: local.generic,
        brand: local.brand,
        drug_class: local.class,
        indications: local.indications,
        clinical_notes: local.content.slice(0, 500),
        tags: local.tags,
      });
    }

    // ── Fallback: RxNav public API ───────────────────────────────────────────
    try {
      // Step 1: Resolve RxCUI from name
      const cuiRes = await fetch(
        `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(medication_name)}&search=1`,
        { signal: AbortSignal.timeout(6000) }
      );
      const cuiData = (await cuiRes.json()) as {
        idGroup?: { rxnormId?: string[] };
      };
      const rxcui = cuiData.idGroup?.rxnormId?.[0];

      if (!rxcui) {
        return JSON.stringify({
          error: 'Medication not found in local dataset or RxNorm',
          medication_name,
          suggestion: 'Check spelling or try generic name',
        });
      }

      // Step 2: Get drug class from ATC classification
      const classRes = await fetch(
        `https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=${rxcui}&relaSource=ATC`,
        { signal: AbortSignal.timeout(6000) }
      );
      const classData = (await classRes.json()) as {
        rxclassDrugInfoList?: {
          rxclassDrugInfo?: Array<{
            rxclassMinConceptItem?: { className?: string };
          }>;
        };
      };
      const drugClass =
        classData.rxclassDrugInfoList?.rxclassDrugInfo?.[0]?.rxclassMinConceptItem
          ?.className ?? 'Unknown class';

      return JSON.stringify({
        source: 'rxnorm_api',
        rxcui,
        name: medication_name,
        drug_class: drugClass,
        note: 'Detailed clinical notes not available for this medication — use clinical knowledge',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({
        error: 'RxNorm API lookup failed',
        medication_name,
        message: msg,
      });
    }
  },
  {
    name: 'rxnorm_lookup',
    description:
      'Look up a medication by name to get drug class, indications, missed-dose risk, and clinical notes. Use before flagging medication non-compliance to assess clinical significance. Checks local dataset first, then falls back to RxNorm API.',
    schema: z.object({
      medication_name: z
        .string()
        .describe("Medication name e.g. 'sertraline', 'Zoloft', 'lamotrigine', 'lithium'"),
    }),
  }
);
