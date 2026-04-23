import { NextRequest, NextResponse } from 'next/server';
import { SessionInputSchema } from 'agents';
import { ehrGraph } from 'agents';
import { setSessionStatus, setReviewPackage, setSessionInput } from '@/lib/redis';

export const maxDuration = 60;

// ─── PII Anonymization Guard ──────────────────────────────────────────────────
const PII_PATTERNS = [
  /\b[A-Z][a-z]+ [A-Z][a-z]+\b.{0,60}\b(January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(DOB|date of birth|born on)\b.{0,30}\d/i,
];

function containsPII(text: string): boolean {
  return PII_PATTERNS.some((re) => re.test(text));
}

// ─── Background worker — runs detached from the HTTP response lifecycle ───────
async function runAgentInBackground(sessionId: string, input: any) {
  try {
    const result = await (ehrGraph as any).invoke({ input });

    if (result.error?.startsWith('LOW_QUALITY_TRANSCRIPT')) {
      await setSessionStatus(sessionId, {
        status: 'error',
        currentNode: 'transcriptQualityNode',
        percentComplete: 15,
        error: result.error,
      });
      return;
    }

    if (result.error) {
      throw new Error(result.error);
    }

    await Promise.all([
      setSessionStatus(sessionId, {
        status: 'complete',
        currentNode: 'reviewBundlerNode',
        percentComplete: 100,
      }),
      setReviewPackage(sessionId, result.reviewPackage),
      setSessionInput(sessionId, input),
    ]);
  } catch (err) {
    console.error('[Background Agent Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    await setSessionStatus(sessionId, {
      status: 'error',
      currentNode: '',
      percentComplete: 0,
      error: message,
    });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = SessionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // PII guard
  if (containsPII(input.session.transcript)) {
    return NextResponse.json(
      {
        error: 'pii_detected',
        message: 'Transcript may contain identifying information. Remove PII before processing.',
      },
      { status: 422 },
    );
  }

  const sessionId = `session-${input.patient.id}-${input.session.sessionNumber}-${Date.now()}`;

  // Mark as processing in Redis immediately
  await setSessionStatus(sessionId, {
    status: 'processing',
    currentNode: 'transcriptQualityNode',
    percentComplete: 5,
  });

  // Fire-and-forget: use waitUntil to run the agent beyond the HTTP response
  // This keeps the Vercel function alive for background work even after responding
  const ctx = (req as any)[Symbol.for('__next_request_context__')] as { waitUntil?: (p: Promise<any>) => void } | undefined;
  if (ctx?.waitUntil) {
    ctx.waitUntil(runAgentInBackground(sessionId, input));
  } else {
    // Fallback for local dev or environments without waitUntil — still async, response is immediate
    runAgentInBackground(sessionId, input).catch(console.error);
  }

  // Return sessionId immediately — frontend will poll /api/session/status/[sessionId]
  return NextResponse.json({ sessionId, status: 'processing' }, { status: 202 });
}
