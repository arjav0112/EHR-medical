import { NextRequest, NextResponse } from 'next/server';
import { getSessionStatus, getReviewPackage } from '@/lib/redis';

export const maxDuration = 10;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json({ error: 'missing_session_id' }, { status: 400 });
  }

  const status = await getSessionStatus(sessionId);

  if (!status) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
  }

  // If complete, also return the review package so client only needs one round trip
  if (status.status === 'complete') {
    const reviewPackage = await getReviewPackage(sessionId);
    return NextResponse.json({
      status: 'complete',
      sessionId,
      reviewPackage,
    });
  }

  // If error, surface the error detail
  if (status.status === 'error') {
    return NextResponse.json({
      status: 'error',
      error: status.error ?? 'processing_error',
      currentNode: status.currentNode,
    });
  }

  // Still processing — return progress info
  return NextResponse.json({
    status: 'processing',
    currentNode: status.currentNode,
    percentComplete: status.percentComplete,
  });
}
