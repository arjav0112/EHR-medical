import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildFHIRBundle } from '@/lib/fhir/buildFHIRBundle';

// ─── Validation ───────────────────────────────────────────────────────────────

const FinalizeSchema = z.object({
  reviewPackage: z.any(), // Full ReviewPackage — validated below
  approvedSections: z.record(z.boolean()),
  patientId: z.string().optional().default('anonymous'),
  sessionId: z.string().optional(),
  clinicianAddendum: z.string().max(2000).optional(),
});

// ─── POST /api/session/finalize ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json();
    const parsed = FinalizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reviewPackage, patientId, sessionId, approvedSections } = parsed.data;
    const sid = sessionId ?? reviewPackage?.sessionId ?? `session-${Date.now()}`;

    // Guard: all sections must be approved
    const requiredSections = ['subjective', 'objective', 'assessment', 'plan'];
    const allApproved = requiredSections.every((s) => approvedSections[s] === true);
    if (!allApproved) {
      return NextResponse.json(
        {
          error: 'incomplete_review',
          message: 'All SOAP sections must be approved before finalizing.',
          missing: requiredSections.filter((s) => !approvedSections[s]),
        },
        { status: 422 }
      );
    }

    // Build FHIR R4 bundle
    const fhirBundle = buildFHIRBundle(reviewPackage, patientId, sid);

    const elapsed = Date.now() - start;
    return NextResponse.json(fhirBundle, {
      status: 200,
      headers: {
        'Content-Type': 'application/fhir+json',
        'X-Processing-Time': `${elapsed}ms`,
        'X-Session-Id': sid,
        'X-FHIR-Version': '4.0.1',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[/api/session/finalize] Error:', message);
    return NextResponse.json(
      { error: 'finalize_failed', message },
      { status: 500 }
    );
  }
}
