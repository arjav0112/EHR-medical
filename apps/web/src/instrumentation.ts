/**
 * Next.js instrumentation hook — runs once on server startup.
 * Initialises Sentry (server + edge) and validates Firebase config.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // ── Sentry ────────────────────────────────────────────────────────────────
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }

  // ── Firebase env check ───────────────────────────────────────────────────
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.warn('⚠️  [Firebase] NEXT_PUBLIC_FIREBASE_PROJECT_ID not set — skipping config check.');
    return;
  }

  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];

  const missing = required.filter(k => !process.env[k]);

  if (missing.length > 0) {
    console.warn(`⚠️  [Firebase] Missing env vars: ${missing.join(', ')}`);
  } else {
    console.log(`✅ [Firebase] Config OK — project: ${projectId}`);
  }
}
