/**
 * Next.js instrumentation hook — runs once on server startup (Node.js runtime only).
 * Verifies Firestore is reachable and logs the result.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.warn('⚠️  [Firebase] NEXT_PUBLIC_FIREBASE_PROJECT_ID not set — skipping DB check.');
    return;
  }

  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getFirestore, collection, getDocs, query, limit } = await import('firebase/firestore');

    const config = {
      apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId,
      storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    };

    const app = getApps().length ? getApp() : initializeApp(config);
    const db  = getFirestore(app);

    const snap = await getDocs(query(collection(db, 'sessions'), limit(1)));

    console.log(`✅ [Firebase] Firestore OK — project: ${projectId} · sessions collection: ${snap.size} doc(s) sampled`);
  } catch (err) {
    console.error('❌ [Firebase] Firestore connection failed:', err instanceof Error ? err.message : err);
  }
}
