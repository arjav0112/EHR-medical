import { NextRequest, NextResponse } from 'next/server';
import { ehrGraph, SessionInputSchema } from 'agents';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = SessionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await (ehrGraph as any).invoke({ input: parsed.data });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(result.reviewPackage);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
