import { Redis } from '@upstash/redis';

// Single shared client — Upstash REST-based, safe for serverless/edge
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─── Session status helpers ────────────────────────────────────────────────────

const SESSION_TTL = 60 * 60 * 2; // 2 hours

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
