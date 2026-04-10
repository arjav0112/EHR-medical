import { NextRequest, NextResponse } from 'next/server';
import { listSessionsForClinician } from '@/lib/firebase/sessions';

/**
 * GET /api/sessions?clinicianId=xxx&limit=50
 * Returns a list of sessions for the dashboard.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clinicianId = searchParams.get('clinicianId') ?? 'default';
  const pageSize    = parseInt(searchParams.get('limit') ?? '50', 10);

  try {
    const sessions = await listSessionsForClinician(clinicianId, { pageSize });
    return NextResponse.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
