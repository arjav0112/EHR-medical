import { NextRequest, NextResponse } from 'next/server';
import { getReviewPackage, getSessionInput, setReviewPackage, setSessionInput } from '@/lib/redis';
import { demoReviewPackage, demoTranscript } from '@/lib/demo/demoData';
import type { ReviewPackage, SessionInput } from 'agents';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // ── Demo shortcut — no Redis needed ────────────────────────────────────────
  if (id === 'demo') {
    return NextResponse.json({
      reviewPackage: demoReviewPackage,
      sessionInput: {
        session: {
          transcript: demoTranscript,
          sessionType: 'follow_up',
          sessionNumber: 7,
          durationMinutes: 50,
          modality: 'telehealth',
          noteVerbosity: 'standard',
        },
        patient: {
          patientId: 'P-DEMO',
          age: 34,
          gender: 'female',
          knownDiagnoses: ['F32.1 — Major Depressive Disorder (Moderate)'],
          currentMedications: ['Sertraline 50mg'],
        },
      },
    });
  }

  // ── Primary: Redis (fast, in-memory) ────────────────────────────────────────
  let [pkg, sessionInput] = await Promise.all([
    getReviewPackage(id),
    getSessionInput(id),
  ]);

  if (pkg) {
    return NextResponse.json({ reviewPackage: pkg, sessionInput });
  }

  return NextResponse.json(
    { error: 'session_not_found', message: `No review package found in Redis cache for session: ${id}` },
    { status: 404 },
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id === 'demo') {
    return NextResponse.json({ ok: true });
  }

  let body: { reviewPackage?: ReviewPackage; sessionInput?: SessionInput | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.reviewPackage?.soapNote) {
    return NextResponse.json({ error: 'missing_review_package' }, { status: 400 });
  }

  await setReviewPackage(id, body.reviewPackage);
  if (body.sessionInput) {
    await setSessionInput(id, body.sessionInput);
  }

  return NextResponse.json({ ok: true });
}
