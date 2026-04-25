/**
 * lib/firebase/sessions.ts
 *
 * Server-side Firestore operations for clinical sessions.
 * Uses firebase-admin via the Admin SDK — never runs in the browser.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import type { ReviewPackage, SessionInput } from 'agents';

// ─── Collection name ──────────────────────────────────────────────────────────
const SESSIONS_COL = 'sessions';

// ─── Firestore session document shape ────────────────────────────────────────
export interface SessionRecord {
  sessionId:          string;
  clinicianId:        string;        // uid or email for now
  // Patient
  patientId:          string;
  patientAge:         number;
  patientGender:      string;
  knownDiagnoses:     string[];
  currentMedications: string[];
  // Session meta
  sessionType:        string;
  sessionNumber:      number;
  modality:           string;
  durationMinutes:    number;
  // Clinical output
  status:             'processing' | 'complete' | 'approved';
  overallRiskLevel:   string;
  primaryDiagnosis?:  { dsm5Code: string; label: string; confidence: number };
  // Full data blob
  reviewPackage:      ReviewPackage;
  sessionInput?:      SessionInput | null;
  // Timestamps (stored as Firestore Timestamp, returned as Date)
  createdAt:          Date | null;
  completedAt:        Date | null;
}

/** Write (or overwrite) a session document. Call this AFTER the agents complete. */
export async function saveSession(
  session: Omit<SessionRecord, 'createdAt' | 'completedAt'> & {
    createdAt?: Date | null;
  },
): Promise<void> {
  const ref = doc(collection(db, SESSIONS_COL), session.sessionId);

  const primaryDx = session.reviewPackage?.diagnosisSuggestions?.[0];

  await setDoc(ref, {
    ...session,
    primaryDiagnosis: primaryDx
      ? { dsm5Code: primaryDx.dsm5Code, label: primaryDx.label, confidence: primaryDx.confidence }
      : null,
    createdAt:   session.createdAt ? Timestamp.fromDate(session.createdAt) : serverTimestamp(),
    completedAt: serverTimestamp(),
  });
}

/** Persist the latest review package after clinician edits or AI refinement. */
export async function updateSessionReviewPackage(
  sessionId: string,
  reviewPackage: ReviewPackage,
): Promise<void> {
  const ref = doc(collection(db, SESSIONS_COL), sessionId);
  const primaryDx = reviewPackage?.diagnosisSuggestions?.[0];

  await setDoc(
    ref,
    {
      reviewPackage,
      primaryDiagnosis: primaryDx
        ? { dsm5Code: primaryDx.dsm5Code, label: primaryDx.label, confidence: primaryDx.confidence }
        : null,
      overallRiskLevel: reviewPackage?.overallRiskLevel ?? 'unknown',
      status: reviewPackage?.reviewStatus === 'complete' ? 'complete' : 'processing',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Fetch a single session by its ID. */
export async function getSessionRecord(sessionId: string): Promise<SessionRecord | null> {
  const ref  = doc(collection(db, SESSIONS_COL), sessionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return fromDoc(snap.id, snap.data() as DocumentData);
}

/** List sessions for a clinician sorted by newest first. */
export async function listSessionsForClinician(
  clinicianId: string,
  options: { pageSize?: number } = {},
): Promise<SessionRecord[]> {
  // Simple collection scan — avoids composite index requirement.
  // Filter + sort in JS, which is fine for per-clinician volumes.
  const snap = await getDocs(collection(db, SESSIONS_COL));
  const results: SessionRecord[] = [];

  for (const d of snap.docs) {
    try {
      const record = fromDoc(d.id, d.data());
      if (record.clinicianId === clinicianId) results.push(record);
    } catch {
      // Skip malformed / pre-auth legacy documents silently
    }
  }

  return results
    .sort((a, b) => {
      const ta = a.completedAt?.getTime() ?? 0;
      const tb = b.completedAt?.getTime() ?? 0;
      return tb - ta;
    })
    .slice(0, options.pageSize ?? 50);
}

/** List all sessions for a patient across clinicians. */
export async function listSessionsForPatient(patientId: string): Promise<SessionRecord[]> {
  const q = query(
    collection(db, SESSIONS_COL),
    where('patientId', '==', patientId),
    orderBy('completedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromDoc(d.id, d.data()));
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function fromDoc(id: string, data: DocumentData): SessionRecord {
  return {
    sessionId:          id,
    clinicianId:        data.clinicianId ?? '',
    patientId:          data.patientId ?? '',
    patientAge:         data.patientAge ?? 0,
    patientGender:      data.patientGender ?? '',
    knownDiagnoses:     data.knownDiagnoses ?? [],
    currentMedications: data.currentMedications ?? [],
    sessionType:        data.sessionType ?? 'follow_up',
    sessionNumber:      data.sessionNumber ?? 1,
    modality:           data.modality ?? 'in_person',
    durationMinutes:    data.durationMinutes ?? 50,
    status:             data.status ?? 'complete',
    overallRiskLevel:   data.overallRiskLevel ?? 'low',
    primaryDiagnosis:   data.primaryDiagnosis ?? undefined,
    reviewPackage:      data.reviewPackage as ReviewPackage,
    sessionInput:        (data.sessionInput as SessionInput | undefined) ?? null,
    createdAt:          (data.createdAt as Timestamp)?.toDate() ?? null,
    completedAt:        (data.completedAt as Timestamp)?.toDate() ?? null,
  };
}
