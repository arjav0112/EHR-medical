/**
 * Structured logger for EHR Copilot.
 *
 * Dev  → coloured console output
 * Prod → JSON lines (picked up by Vercel Log Drains, Sentry breadcrumbs, etc.)
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  message: string;
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === 'production';

function emit(level: Level, payload: LogPayload) {
  const entry = {
    level,
    ts:  new Date().toISOString(),
    env: process.env.NODE_ENV ?? 'development',
    ...payload,
  };

  if (IS_PROD) {
    // JSON lines → Vercel runtime logs / any log drain
    const fn = level === 'error' ? console.error
              : level === 'warn'  ? console.warn
              : console.log;
    fn(JSON.stringify(entry));
  } else {
    const colour = {
      debug: '\x1b[36m',  // cyan
      info:  '\x1b[32m',  // green
      warn:  '\x1b[33m',  // yellow
      error: '\x1b[31m',  // red
    }[level];
    const reset = '\x1b[0m';
    const tag   = `${colour}[${level.toUpperCase()}]${reset}`;
    const { message, ...rest } = payload;
    const extras = Object.keys(rest).length ? rest : undefined;

    if (level === 'error') {
      console.error(tag, message, ...(extras ? [extras] : []));
    } else if (level === 'warn') {
      console.warn(tag, message, ...(extras ? [extras] : []));
    } else {
      console.log(tag, message, ...(extras ? [extras] : []));
    }
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit('debug', { message, ...meta }),
  info:  (message: string, meta?: Record<string, unknown>) => emit('info',  { message, ...meta }),
  warn:  (message: string, meta?: Record<string, unknown>) => emit('warn',  { message, ...meta }),

  /**
   * Log an error. Pass the raw Error object as `err` — in production,
   * the stack trace will be included in the JSON line.
   */
  error: (message: string, err?: unknown, meta?: Record<string, unknown>) => {
    const errData = err instanceof Error
      ? { errorMessage: err.message, stack: IS_PROD ? err.stack : undefined }
      : err !== undefined ? { err } : {};

    // Also forward to Sentry in prod (lazy import avoids bundling in server builds)
    if (IS_PROD && err instanceof Error) {
      import('@sentry/nextjs').then(async ({ captureException, withScope, flush }) => {
        withScope((scope) => {
          if (meta) Object.entries(meta).forEach(([k, v]) => scope.setExtra(k, v));
          captureException(err);
        });
        await flush(1000);
      }).catch(() => { /* ignore Sentry import failures */ });
    }

    emit('error', { message, ...errData, ...meta });
  },
};
