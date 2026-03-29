import { NextRequest, NextResponse } from 'next/server';
import { getSessionStatus } from '@/lib/redis';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const status = await getSessionStatus(id);

  if (!status) {
    return NextResponse.json(
      { error: 'session_not_found', message: `No session found with id: ${id}` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    sessionId: id,
    status: status.status,
    currentNode: status.currentNode,
    percentComplete: status.percentComplete,
    ...(status.error ? { error: status.error } : {}),
  });
}
