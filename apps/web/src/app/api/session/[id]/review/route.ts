import { NextRequest, NextResponse } from 'next/server';
import { getReviewPackage, getSessionInput } from '@/lib/redis';
import { demoReviewPackage, demoTranscript } from '@/lib/demo/demoData';

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

  const [pkg, sessionInput] = await Promise.all([
    getReviewPackage(id),
    getSessionInput(id),
  ]);

  if (!pkg) {
    return NextResponse.json(
      { error: 'session_not_found', message: `No review package found for session: ${id}` },
      { status: 404 },
    );
  }

  return NextResponse.json({ reviewPackage: pkg, sessionInput });
}
