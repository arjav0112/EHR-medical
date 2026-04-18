/**
 * Next.js instrumentation hook — runs once on server startup (Node.js runtime only).
 * Verifies Firebase project config is present and logs the result.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.warn('⚠️  [Firebase] NEXT_PUBLIC_FIREBASE_PROJECT_ID not set — skipping config check.');
    return;
  }

  // Firestore security rules now require authentication, so we skip the live
  // connection probe at startup (it would always fail without a user token).
  // Just confirm the env vars are wired correctly.
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
