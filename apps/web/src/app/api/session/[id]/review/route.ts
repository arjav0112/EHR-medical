import { NextRequest, NextResponse } from 'next/server';
import { getReviewPackage, getSessionInput, setReviewPackage, setSessionInput } from '@/lib/redis';
import { getSessionRecord } from '@/lib/firebase/sessions';
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

  // ── Primary: Redis (fast, in-memory) ────────────────────────────────────────
  let [pkg, sessionInput] = await Promise.all([
    getReviewPackage(id),
    getSessionInput(id),
  ]);

  if (pkg) {
    return NextResponse.json({ reviewPackage: pkg, sessionInput });
  }

  // ── Fallback: Firestore (persistent, survives Redis TTL) ────────────────────
  console.log(`[review] Redis miss for ${id} — falling back to Firestore`);

  let record = null;
  try {
    record = await getSessionRecord(id);
  } catch (e) {
    console.error('[review] Firestore unavailable:', e instanceof Error ? e.message : e);
  }

  if (!record) {
    return NextResponse.json(
      { error: 'session_not_found', message: `No review package found for session: ${id}` },
      { status: 404 },
    );
  }

  pkg = record.reviewPackage;

  // Re-warm Redis so subsequent loads are fast (fire-and-forget)
  const rehydratedInput = {
    session: {
      transcript:      '',
      sessionType:     record.sessionType,
      sessionNumber:   record.sessionNumber,
      durationMinutes: record.durationMinutes,
      modality:        record.modality,
    },
    patient: {
      id:                 record.patientId,
      age:                record.patientAge,
      gender:             record.patientGender,
      knownDiagnoses:     record.knownDiagnoses,
      currentMedications: record.currentMedications,
    },
    priorNotes:           [],
    clinicianPreferences: { noteVerbosity: 'standard', alwaysIncludeRiskSection: true },
  } as any;

  Promise.all([
    setReviewPackage(id, pkg),
    setSessionInput(id, rehydratedInput),
  ]).catch((e) => console.error('[review] Redis re-warm failed:', e));

  return NextResponse.json({ reviewPackage: pkg, sessionInput: rehydratedInput });
}
