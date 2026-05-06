import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Lightweight TF-IDF-style similarity: ratio of shared content words
 * between two text windows. No external deps.
 */
function contentSimilarity(text1: string, text2: string): number {
  const stopWords = new Set(['the', 'and', 'that', 'have', 'for', 'not', 'with', 'this', 'was', 'are', 'from', 'they', 'been', 'has', 'had']);
  const tokenize = (t: string) =>
    t
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

  const words1 = new Set(tokenize(text1));
  const words2 = new Set(tokenize(text2));
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter((w) => words2.has(w));
  // Jaccard-style similarity weighted toward claim coverage
  return intersection.length / Math.sqrt(words1.size * words2.size);
}

/**
 * Tool 4 — Transcript Citation Finder
 * Scans the full session transcript to find the line ranges that best
 * support a given clinical claim. Returns top 3 excerpts with scores.
 * Use ONLY citations returned by this tool — never fabricate line numbers.
 */
export const transcriptCitationTool = tool(
  async ({ transcript, claim, context_lines = 3 }) => {
    const lines = transcript.split('\n').filter((l) => l.trim().length > 0);
    const results: Array<{ lines: string; excerpt: string; score: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      // Sliding window of context_lines
      const window = lines.slice(i, i + context_lines).join(' ');
      const score = contentSimilarity(window, claim);
      if (score > 0.08) {
        results.push({
          lines: `lines:${i + 1}-${Math.min(i + context_lines, lines.length)}`,
          excerpt: window.slice(0, 250),
          score: Math.round(score * 100) / 100,
        });
      }
    }

    const top3 = results.sort((a, b) => b.score - a.score).slice(0, 3);

    if (!top3.length) {
      return JSON.stringify({
        error: 'No matching transcript section found for this claim',
        claim,
        suggestion: 'If the claim cannot be grounded in the transcript, do not include it in the SOAP note.',
      });
    }

    return JSON.stringify({ citations: top3, claim });
  },
  {
    name: 'extract_citation',
    description:
      "Find the exact transcript line numbers that support a clinical claim. Returns top 3 matching excerpts with line ranges and similarity scores. Never fabricate citations — only use what this tool returns. Use for every factual claim in the SOAP note.",
    schema: z.object({
      transcript: z.string().describe('Full session transcript text'),
      claim: z.string().describe(
        'The clinical claim to find evidence for, e.g. "patient reports feeling depressed"'
      ),
      context_lines: z
        .number()
        .optional()
        .describe('Lines per sliding window (default 3)'),
    }),
  }
);
