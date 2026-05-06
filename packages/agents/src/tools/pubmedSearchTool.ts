import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Tool 6 — PubMed Search
 * Queries the NCBI Entrez API to retrieve recent clinical evidence.
 * Gracefully degrades when NCBI_API_KEY is absent (rate-limited but functional).
 * Use for atypical presentations or to ground unusual diagnostic reasoning.
 */
export const pubmedSearchTool = tool(
  async ({ query, max_results = 3 }) => {
    try {
      const apiKey = process.env.NCBI_API_KEY;
      const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
      const keyParam = apiKey ? `&api_key=${apiKey}` : '';

      // ── 1. Search for PMIDs ──────────────────────────────────────────────
      const searchRes = await fetch(
        `${baseUrl}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query + ' psychiatry')}&retmax=${max_results}&retmode=json${keyParam}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!searchRes.ok) {
        return JSON.stringify({
          results: [],
          message: `PubMed search HTTP ${searchRes.status}`,
        });
      }

      const searchData = (await searchRes.json()) as {
        esearchresult?: { idlist?: string[] };
      };
      const ids: string[] = searchData.esearchresult?.idlist ?? [];

      if (!ids.length) {
        return JSON.stringify({ results: [], message: 'No PubMed results found for this query' });
      }

      // ── 2. Rate-limit courtesy delay (NCBI asks for ≤3 req/sec without key) ──
      await new Promise((r) => setTimeout(r, apiKey ? 100 : 350));

      // ── 3. Fetch XML summaries ───────────────────────────────────────────
      const fetchRes = await fetch(
        `${baseUrl}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=xml${keyParam}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const xml = await fetchRes.text();

      // Minimal XML scraping — extracts first title/abstract per article
      const titleRe = /<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/g;
      const abstractRe = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;

      const titles: string[] = [];
      const abstracts: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = titleRe.exec(xml)) !== null) titles.push(m[1].replace(/<[^>]+>/g, ''));
      while ((m = abstractRe.exec(xml)) !== null) abstracts.push(m[1].replace(/<[^>]+>/g, ''));

      const articles = ids.map((id, idx) => ({
        pmid: id,
        title: titles[idx] ?? 'Title unavailable',
        abstract: (abstracts[idx] ?? 'Abstract unavailable').slice(0, 350),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      }));

      return JSON.stringify({ results: articles, query });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ error: 'PubMed search failed', message: msg, results: [] });
    }
  },
  {
    name: 'pubmed_search',
    description:
      'Search PubMed for recent clinical evidence. Use for atypical presentations, unusual symptom combinations, or to verify a diagnosis against current literature. Returns PMIDs, titles, abstracts, and direct URLs.',
    schema: z.object({
      query: z
        .string()
        .describe(
          "Clinical search query e.g. 'sertraline PTSD treatment 2023' or 'atypical depression lamotrigine'"
        ),
      max_results: z
        .number()
        .optional()
        .describe('Max results to return, default 3 (max 5 recommended)'),
    }),
  }
);
