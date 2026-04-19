import { NextRequest, NextResponse } from 'next/server';
import type { NextMiddlewareResult } from 'next/dist/server/web/types';

import { redis } from '@/lib/redis';

// ─── Rate limit policies per route ────────────────────────────────────────────
//
//  /api/session/process  — full SOAP pipeline (~6 Gemini calls, $$$)
//    • IP:  5 req / 60 s   (hard)
//    • UID: 20 req / 60 min (burst protection for a single authenticated user)
//
//  /api/session/revise   — single Gemini streaming call per section
//    • IP:  15 req / 60 s
//    • UID: 60 req / 60 min
//
//  /api/analyze          — same as process (full pipeline)
//    • IP:  5 req / 60 s
//    • UID: 20 req / 60 min
//
//  TRANSCRIPT_SIZE_LIMIT — reject payloads > 64 KB to avoid token-stuffing attacks

const TRANSCRIPT_SIZE_LIMIT_BYTES = 64 * 1024; // 64 KB

const POLICIES: Record<string, { ip: { max: number; windowSec: number }; uid: { max: number; windowSec: number } }> = {
  '/api/session/process': {
    ip:  { max: 5,  windowSec: 60 },
    uid: { max: 20, windowSec: 3600 },
  },
  '/api/session/revise': {
    ip:  { max: 15, windowSec: 60 },
    uid: { max: 60, windowSec: 3600 },
  },
  '/api/analyze': {
    ip:  { max: 5,  windowSec: 60 },
    uid: { max: 20, windowSec: 3600 },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// Firebase ID token is a JWT — extract sub (uid) from the payload without verifying
// (verification happens server-side in the route handler; here we only need the uid for bucketing)
function extractUidFromBearer(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const token = auth.slice(7);
    const [, payload] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}

async function checkLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  const ttl   = await redis.ttl(key);
  const reset = Date.now() + ttl * 1000;
  return { allowed: count <= max, remaining: Math.max(0, max - count), resetAt: reset };
}

function tooManyResponse(resetAt: number, max: number, scope: 'ip' | 'uid'): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    {
      error: 'rate_limit_exceeded',
      scope,
      message:
        scope === 'uid'
          ? `You have exceeded your hourly quota of ${max} AI sessions. Please wait before trying again.`
          : `Too many requests from this network. Limit: ${max} per minute.`,
      retryAfter,
      resetAt: new Date(resetAt).toISOString(),
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(resetAt),
      },
    },
  );
}

// ─── Proxy (replaces middleware) ───────────────────────────────────────────────

export async function proxy(req: NextRequest): Promise<NextMiddlewareResult> {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // ── Only POST routes hit Gemini ────────────────────────────────────────────
  if (method === 'POST' && pathname in POLICIES) {
    const policy = POLICIES[pathname];
    const ip     = getIP(req);
    const uid    = extractUidFromBearer(req);

    // ── 1. Transcript size guard (prevents token-stuffing in process/analyze) ─
    if (pathname === '/api/session/process' || pathname === '/api/analyze') {
      const contentLength = Number(req.headers.get('content-length') ?? 0);
      if (contentLength > TRANSCRIPT_SIZE_LIMIT_BYTES) {
        return NextResponse.json(
          {
            error: 'payload_too_large',
            message: `Request body exceeds the ${TRANSCRIPT_SIZE_LIMIT_BYTES / 1024} KB limit. Please shorten the transcript.`,
          },
          { status: 413 },
        );
      }
    }

    // ── 2. Per-IP limit ───────────────────────────────────────────────────────
    const ipKey = `rl:ip:${pathname}:${ip}`;
    const ipResult = await checkLimit(ipKey, policy.ip.max, policy.ip.windowSec);
    if (!ipResult.allowed) {
      return addSecurityHeaders(tooManyResponse(ipResult.resetAt, policy.ip.max, 'ip'));
    }

    // ── 3. Per-authenticated-user limit (if bearer token present) ─────────────
    if (uid) {
      const uidKey = `rl:uid:${pathname}:${uid}`;
      const uidResult = await checkLimit(uidKey, policy.uid.max, policy.uid.windowSec);
      if (!uidResult.allowed) {
        return addSecurityHeaders(tooManyResponse(uidResult.resetAt, policy.uid.max, 'uid'));
      }
    }

    // ── 4. Pass through with rate-limit headers ───────────────────────────────
    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Limit', String(policy.ip.max));
    res.headers.set('X-RateLimit-Remaining', String(ipResult.remaining));
    res.headers.set('X-RateLimit-Reset', String(ipResult.resetAt));
    return addSecurityHeaders(res);
  }

  return addSecurityHeaders(NextResponse.next());
}

// ─── Security headers ─────────────────────────────────────────────────────────

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://apis.google.com https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.googleusercontent.com https://lh3.googleusercontent.com",
      "connect-src 'self' blob: data: https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com wss://*.firebaseio.com",
      "frame-src 'self' blob: https://accounts.google.com https://*.firebaseapp.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; '),
  );
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

// ─── Route matcher ────────────────────────────────────────────────────────────

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
