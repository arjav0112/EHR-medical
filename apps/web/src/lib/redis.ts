import { Redis } from '@upstash/redis';

// Single shared client — Upstash REST-based, safe for serverless/edge
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─── Session status helpers ────────────────────────────────────────────────────

const SESSION_TTL = 60 * 60 * 24; // 24 hours (86,400s)

export interface SessionStatus {
  status: 'processing' | 'complete' | 'error';
  currentNode: string;
  percentComplete: number;
  error?: string;
}

export async function setSessionStatus(id: string, value: SessionStatus): Promise<void> {
  // hset stores as hash fields; ex sets TTL in seconds
  await redis.hset(`session:${id}`, value as unknown as Record<string, unknown>);
  await redis.expire(`session:${id}`, SESSION_TTL);
}

export async function getSessionStatus(id: string): Promise<SessionStatus | null> {
  const data = await redis.hgetall(`session:${id}`) as SessionStatus | null;
  if (!data || Object.keys(data).length === 0) return null;
  // Redis returns strings — coerce numeric field
  return {
    ...data,
    percentComplete: Number(data.percentComplete),
  };
}

// ─── ReviewPackage persistence ────────────────────────────────────────────────

import type { ReviewPackage, SessionInput } from 'agents';

export async function setReviewPackage(id: string, pkg: ReviewPackage): Promise<void> {
  await redis.set(`review:${id}`, JSON.stringify(pkg), { ex: SESSION_TTL });
}

export async function getReviewPackage(id: string): Promise<ReviewPackage | null> {
  // Upstash REST client auto-deserializes JSON, returning an object — not a string.
  // Using <ReviewPackage | string> handles both cases gracefully.
  const raw = await redis.get<ReviewPackage | string>(`review:${id}`);
  if (!raw) {
    console.warn(`[REDIS] No review package found for key: review:${id}`);
    return null;
  }
  if (typeof raw === 'object') return raw as ReviewPackage;
  try {
    return JSON.parse(raw as string) as ReviewPackage;
  } catch {
    console.error('[REDIS] Failed to parse reviewPackage JSON');
    return null;
  }
}

// ─── SessionInput persistence ─────────────────────────────────────────────────

export async function setSessionInput(id: string, input: SessionInput): Promise<void> {
  await redis.set(`input:${id}`, JSON.stringify(input), { ex: SESSION_TTL });
}

export async function getSessionInput(id: string): Promise<SessionInput | null> {
  const raw = await redis.get<SessionInput | string>(`input:${id}`);
  if (!raw) return null;
  if (typeof raw === 'object') return raw as SessionInput;
  try {
    return JSON.parse(raw as string) as SessionInput;
  } catch {
    return null;
  }
}
