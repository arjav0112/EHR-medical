import { NextRequest, NextResponse } from 'next/server';
import { SessionInputSchema } from 'agents';
import { inngest } from '@/lib/inngest';
import { setSessionStatus } from '@/lib/redis';

export const maxDuration = 15; // This route just validates + fires an event — very fast

// ─── PII Anonymization Guard ──────────────────────────────────────────────────
const PII_PATTERNS = [
  /\b[A-Z][a-z]+ [A-Z][a-z]+\b.{0,60}\b(January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(DOB|date of birth|born on)\b.{0,30}\d/i,
];

function containsPII(text: string): boolean {
  return PII_PATTERNS.some((re) => re.test(text));
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

  // Mark session as processing in Redis immediately
  await setSessionStatus(sessionId, {
    status: 'processing',
    currentNode: 'transcriptQualityNode',
    percentComplete: 5,
  });

  // Fire Inngest event — returns instantly, Inngest orchestrates the background job
  await inngest.send({
    name: 'session/process.requested',
    data: { sessionId, input },
  });

  // Return sessionId to client — frontend will poll /api/session/status/[sessionId]
  return NextResponse.json({ sessionId, status: 'processing' }, { status: 202 });
}
