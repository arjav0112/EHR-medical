import { NextRequest, NextResponse } from 'next/server';
import { SessionInputSchema, type SessionInput } from 'agents';
import { ehrGraph } from 'agents';
import { setSessionStatus, setReviewPackage, setSessionInput } from '@/lib/redis';
import type { ReviewPackage } from 'agents';

export const maxDuration = 60; // Prevent 15s Hobby timeout for LLM generation

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
  const startTime = Date.now();

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
  // clinicianId: sent from client when logged in, falls back to 'default'
  const clinicianId: string =
    (typeof body === 'object' && body !== null && 'clinicianId' in body)
      ? String((body as Record<string, unknown>).clinicianId)
      : 'default';

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

  // ── Subscription quota check has been moved to the client side.

  const sessionId = `session-${input.patient.id}-${input.session.sessionNumber}-${Date.now()}`;
  await setSessionStatus(sessionId, {
    status: 'processing',
    currentNode: 'transcriptQualityNode',
    percentComplete: 5,
  });

  try {
    const result = await (ehrGraph as any).invoke({ input });

    if (result.error?.startsWith('LOW_QUALITY_TRANSCRIPT')) {
      await setSessionStatus(sessionId, {
        status: 'error',
        currentNode: 'transcriptQualityNode',
        percentComplete: 15,
        error: result.error,
      });
      return NextResponse.json(
        {
          error: 'low_quality_transcript',
          message: result.error.replace('LOW_QUALITY_TRANSCRIPT: ', ''),
          qualityScore: result.transcriptQualityScore,
        },
        {
          status: 422,
          headers: { 'X-Processing-Time': `${Date.now() - startTime}ms` },
        },
      );
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

    // Note: session is saved to Firestore strictly by the client.

    return NextResponse.json(
      {
        ...result.reviewPackage,
        sessionId, // Explicitly include in body for easier frontend capture
      },
      {
        status: 200,
        headers: {
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'X-Session-Id': sessionId,
        },
      },
    );
  } catch (err) {
    console.error('[Process API Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    await setSessionStatus(sessionId, { status: 'error', currentNode: '', percentComplete: 0, error: message });
    return NextResponse.json(
      { error: 'processing_error', message },
      { status: 500, headers: { 'X-Processing-Time': `${Date.now() - startTime}ms` } },
    );
  }
}
