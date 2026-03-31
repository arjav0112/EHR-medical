import { NextRequest, NextResponse } from 'next/server';
import { getReviewPackage, getSessionInput } from '@/lib/redis';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
