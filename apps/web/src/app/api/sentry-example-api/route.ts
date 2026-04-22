import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    throw new Error('[EHR Copilot] Sentry test — delete this route after verification.');
  } catch (err) {
    Sentry.captureException(err);
    // Flush waits up to 2 s for Sentry to actually send the event
    // This is required in serverless environments where the process exits immediately
    await Sentry.flush(2000);
    return NextResponse.json(
      { message: 'Test error sent to Sentry. Check https://arjav.sentry.io/issues/' },
      { status: 200 },
    );
  }
}
