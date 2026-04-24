import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { processSessionFunction } from '@/inngest/functions';

// Allow up to 300s — Inngest calls back into this route for each step.run().
// The full LangGraph graph takes ~130s; this gives comfortable headroom.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processSessionFunction],
});
