import { NextRequest, NextResponse } from 'next/server';
import { listSessionsForClinician } from '@/lib/firebase/sessions';

/**
 * GET /api/sessions?clinicianId=xxx&limit=50
 * Returns a list of sessions for the dashboard.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clinicianId = searchParams.get('clinicianId');
  const pageSize    = parseInt(searchParams.get('limit') ?? '50', 10);

  // No clinicianId or legacy 'default' — return empty list gracefully
  if (!clinicianId || clinicianId === 'default') {
    return NextResponse.json({ sessions: [] });
  }

  try {
    const sessions = await listSessionsForClinician(clinicianId, { pageSize });
    return NextResponse.json({ sessions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch sessions';

    // Firestore permission denied — not a server crash, return 403
    if (message.includes('permission') || message.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { error: 'permission_denied', sessions: [] },
        { status: 403 },
      );
    }

    console.error('[/api/sessions] error:', message);
    return NextResponse.json(
      { error: message, sessions: [] },
      { status: 500 },
    );
  }
}
