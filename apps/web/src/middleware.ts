import { NextRequest, NextResponse } from 'next/server';
import type { NextMiddlewareResult } from 'next/dist/server/web/types';

import { redis } from '@/lib/redis';

const RATE_LIMIT = {
  maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 10),
  windowSec: Math.ceil(Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000) / 1000),
};

function getRateLimitKey(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  return `rl:${ip}`;
}

async function checkRateLimit(
  key: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  // Atomic increment — returns new count
  const count = await redis.incr(key);
  if (count === 1) {
    // First request in this window — set TTL
    await redis.expire(key, RATE_LIMIT.windowSec);
  }
  const ttl = await redis.ttl(key);
  const resetAt = Date.now() + ttl * 1000;
  const allowed = count <= RATE_LIMIT.maxRequests;
  return { allowed, remaining: Math.max(0, RATE_LIMIT.maxRequests - count), resetAt };
}

// ─── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest): Promise<NextMiddlewareResult> {
  const { pathname } = req.nextUrl;

  // ─── Rate limit only on POST /api/session/process ──────────────────────
  if (pathname === '/api/session/process' && req.method === 'POST') {
    const key = getRateLimitKey(req);
    const { allowed, remaining, resetAt } = await checkRateLimit(key);

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          message: `Too many requests. Max ${RATE_LIMIT.maxRequests} per minute. Resets at ${new Date(resetAt).toISOString()}`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetAt),
          },
        },
      );
    }

    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Limit', String(RATE_LIMIT.maxRequests));
    res.headers.set('X-RateLimit-Remaining', String(remaining));
    res.headers.set('X-RateLimit-Reset', String(resetAt));
    return addSecurityHeaders(res);
  }

  return addSecurityHeaders(NextResponse.next());
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  // Content Security Policy
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' blob: data:",
      "frame-src 'self' blob:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; '),
  );

  // Prevent clickjacking
  res.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.headers.set('X-Content-Type-Options', 'nosniff');

  // HSTS (only meaningful over HTTPS)
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // Referrer policy
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return res;
}

export const config = {
  matcher: [
    // Apply to all API routes and pages, skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
