/**
 * lib/firebase/users.ts
 *
 * Reads and writes user subscription data from Firestore `users/{uid}`.
 * Also counts sessions used in the current calendar month.
 *
 * Tier hierarchy:  free → pro → clinic → enterprise
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from './config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'clinic' | 'enterprise';

export interface UserRecord {
  uid:          string;
  email:        string | null;
  displayName:  string | null;
  tier:         SubscriptionTier;
  createdAt:    Date | null;
  lastLoginAt:  Date | null;
}

// ─── Limits per tier ──────────────────────────────────────────────────────────

export const TIER_MONTHLY_SESSION_LIMITS: Record<SubscriptionTier, number | null> = {
  free:       5,
  pro:        null,   // unlimited
  clinic:     null,   // unlimited
  enterprise: null,   // unlimited
};

export interface MonthlySessionUsage {
  tier: SubscriptionTier;
  used: number;
  limit: number | null;
  monthKey: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the user record from Firestore `users/{uid}`.
 * Returns null if the document doesn't exist yet (new user, hasn't been hydrated).
 */
export async function getUserRecord(uid: string): Promise<UserRecord | null> {
  const ref  = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email:       data.email       ?? null,
    displayName: data.displayName ?? null,
    tier:        (data.tier as SubscriptionTier) ?? 'free',
    createdAt:   (data.createdAt  as Timestamp)?.toDate() ?? null,
    lastLoginAt: (data.lastLoginAt as Timestamp)?.toDate() ?? null,
  };
}

/**
 * Creates or updates a user document (upsert).
 * Called during auth sign-up and profile settings saves.
 */
export async function upsertUserRecord(
  uid: string,
  fields: Partial<Omit<UserRecord, 'uid' | 'createdAt'>>,
): Promise<void> {
  const ref  = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...fields,
      tier:      fields.tier ?? 'free',
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      ...fields,
      lastLoginAt: serverTimestamp(),
    });
  }
}

/**
 * Counts how many sessions a clinician has completed in the CURRENT calendar month.
 * Uses the client-side sessions collection scan (same as listSessionsForClinician).
 */
export async function countMonthlySessionsForUser(uid: string): Promise<number> {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);   // 1st of month @ 00:00

  const snap = await getDocs(collection(db, 'sessions'));
  let count  = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (data.clinicianId !== uid) continue;
    const completed: Date | null = (data.completedAt as Timestamp)?.toDate() ?? null;
    if (completed && completed >= start) count++;
  }
  return count;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Recomputes monthly usage from the canonical `sessions` collection and stores
 * a denormalized snapshot on `users/{uid}` for billing/settings display.
 */
export async function syncMonthlySessionUsageForUser(uid: string): Promise<MonthlySessionUsage> {
  const record = await getUserRecord(uid);
  const tier = record?.tier ?? 'free';
  const limit = TIER_MONTHLY_SESSION_LIMITS[tier];
  const used = await countMonthlySessionsForUser(uid);
  const monthKey = currentMonthKey();

  await setDoc(
    doc(db, 'users', uid),
    {
      tier,
      usage: {
        billingMonth: monthKey,
        sessionsProcessed: used,
        monthlySessionLimit: limit,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true },
  );

  return { tier, used, limit, monthKey };
}

/**
 * Checks whether a user is allowed to create a new session given their tier.
 * Returns { allowed: true } or { allowed: false, reason, tier, used, limit }.
 */
export async function checkSessionQuota(uid: string): Promise<
  | { allowed: true }
  | { allowed: false; reason: string; tier: SubscriptionTier; used: number; limit: number }
> {
  // A missing user doc → treat as free tier
  const record = await getUserRecord(uid);
  const tier   = record?.tier ?? 'free';
  const limit  = TIER_MONTHLY_SESSION_LIMITS[tier];

  if (limit === null) return { allowed: true };   // unlimited tier

  const { used } = await syncMonthlySessionUsageForUser(uid);
  if (used >= limit) {
    return {
      allowed: false,
      reason:  `Your ${tier} plan allows ${limit} sessions per month. You've used ${used}. Upgrade to Pro for unlimited sessions.`,
      tier,
      used,
      limit,
    };
  }
  return { allowed: true };
}
