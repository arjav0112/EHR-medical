import { NextRequest, NextResponse } from 'next/server';
import { SessionInputSchema, type SessionInput } from 'agents';
import { ehrGraph } from 'agents';
import { setSessionStatus, setReviewPackage, setSessionInput } from '@/lib/redis';
import { saveSession } from '@/lib/firebase/sessions';
import { checkSessionQuota } from '@/lib/firebase/users';
import type { ReviewPackage } from 'agents';

// ─── Firestore helper ─────────────────────────────────────────────────────────
async function saveSessionToFirestore({
  sessionId, reviewPackage, input, createdAt, clinicianId,
}: {
  sessionId: string;
  reviewPackage: ReviewPackage;
  input: SessionInput;
  createdAt: Date;
  clinicianId: string;
}) {
  await saveSession({
    sessionId,
    clinicianId,
    patientId:          input.patient.id,
    patientAge:         input.patient.age,
    patientGender:      input.patient.gender,
    knownDiagnoses:     input.patient.knownDiagnoses,
    currentMedications: input.patient.currentMedications,
    sessionType:        input.session.sessionType,
    sessionNumber:      input.session.sessionNumber,
    modality:           input.session.modality,
    durationMinutes:    input.session.durationMinutes,
    status:             'complete',
    overallRiskLevel:   reviewPackage.overallRiskLevel,
    reviewPackage,
    createdAt,
  });
}

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

  // ── Subscription quota check (skip for anonymous/default users) ─────────────
  if (clinicianId && clinicianId !== 'default') {
    const quota = await checkSessionQuota(clinicianId);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: 'quota_exceeded',
          message: quota.reason,
          tier: quota.tier,
          used: quota.used,
          limit: quota.limit,
          upgradeUrl: '/pricing',
        },
        { status: 402 },
      );
    }
  }

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

    // Persist to Firestore (fire-and-forget — never blocks the response)
    saveSessionToFirestore({
      sessionId,
      reviewPackage: result.reviewPackage,
      input,
      createdAt: new Date(startTime),
      clinicianId,
    }).catch((e) => console.error('[Firestore] saveSession failed:', e));

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
    const message = err instanceof Error ? err.message : 'Internal server error';
    await setSessionStatus(sessionId, { status: 'error', currentNode: '', percentComplete: 0, error: message });
    return NextResponse.json(
      { error: 'processing_error', message },
      { status: 500, headers: { 'X-Processing-Time': `${Date.now() - startTime}ms` } },
    );
  }
}
