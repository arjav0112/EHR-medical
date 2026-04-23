import { NextRequest, NextResponse } from 'next/server';
import { SessionInputSchema, type SessionInput } from 'agents';
import { ehrGraph } from 'agents';
import { setSessionStatus, setReviewPackage, setSessionInput } from '@/lib/redis';
import type { ReviewPackage } from 'agents';

export const maxDuration = 300; // Allow up to 5 minutes for LLM generation (Requires Vercel Pro)

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send an initial space to immediately flush headers and bypass Vercel initial timeout
      controller.enqueue(encoder.encode(' '));

      // Keep the connection alive while the long-running LangGraph resolves
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(' '));
      }, 2000);

      try {
        const result = await (ehrGraph as any).invoke({ input });
        clearInterval(keepAlive);

        if (result.error?.startsWith('LOW_QUALITY_TRANSCRIPT')) {
          await setSessionStatus(sessionId, {
            status: 'error',
            currentNode: 'transcriptQualityNode',
            percentComplete: 15,
            error: result.error,
          });
          controller.enqueue(
            encoder.encode(
              '\n' +
                JSON.stringify({
                  error: 'low_quality_transcript',
                  message: result.error.replace('LOW_QUALITY_TRANSCRIPT: ', ''),
                  qualityScore: result.transcriptQualityScore,
                })
            )
          );
          controller.close();
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

        controller.enqueue(
          encoder.encode(
            '\n' +
              JSON.stringify({
                ...result.reviewPackage,
                sessionId,
              })
          )
        );
        controller.close();
      } catch (err) {
        clearInterval(keepAlive);
        console.error('[Process API Error]:', err);
        const message = err instanceof Error ? err.message : 'Internal server error';
        await setSessionStatus(sessionId, { status: 'error', currentNode: '', percentComplete: 0, error: message });

        controller.enqueue(
          encoder.encode(
            '\n' +
              JSON.stringify({
                error: 'processing_error',
                message,
              })
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Processing-Time': `${Date.now() - startTime}ms`,
      'X-Session-Id': sessionId,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
