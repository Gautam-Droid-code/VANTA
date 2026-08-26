/**
 * Login rate limiting — IN-MEMORY, INTERIM.
 *
 * Holds attempt counters in a module-level Map. That is genuinely useful
 * against a naive brute-force against a single long-lived server, and it is
 * NOT sufficient in production:
 *
 *   - serverless cold starts wipe the Map
 *   - multiple instances each keep their own copy, multiplying the real limit
 *
 * This must move to a shared store (Vercel KV / Redis) when persistence is
 * wired up. See DECISIONS.md §17.
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes
const WINDOW_MS = 15 * 60 * 1000; // attempts older than this are forgotten

interface Entry {
  failures: number[];
  lockedUntil: number | null;
}

const attempts = new Map<string, Entry>();

export interface RateLimitState {
  allowed: boolean;
  /** Seconds remaining on the lockout, when blocked. */
  retryAfterSeconds: number;
  remainingAttempts: number;
}

function prune(entry: Entry, now: number): void {
  entry.failures = entry.failures.filter((t) => now - t < WINDOW_MS);
  if (entry.lockedUntil !== null && entry.lockedUntil <= now) {
    entry.lockedUntil = null;
    entry.failures = [];
  }
}

export function checkRateLimit(key: string): RateLimitState {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry) return { allowed: true, retryAfterSeconds: 0, remainingAttempts: MAX_ATTEMPTS };

  prune(entry, now);

  if (entry.lockedUntil !== null) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
      remainingAttempts: 0,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - entry.failures.length),
  };
}

/** Records a failed attempt and returns the state *after* recording it. */
export function recordFailure(key: string): RateLimitState {
  const now = Date.now();
  const entry = attempts.get(key) ?? { failures: [], lockedUntil: null };
  prune(entry, now);

  entry.failures.push(now);
  if (entry.failures.length >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  attempts.set(key, entry);

  return entry.lockedUntil !== null
    ? {
        allowed: false,
        retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
        remainingAttempts: 0,
      }
    : {
        allowed: true,
        retryAfterSeconds: 0,
        remainingAttempts: Math.max(0, MAX_ATTEMPTS - entry.failures.length),
      };
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

export const RATE_LIMIT_MAX_ATTEMPTS = MAX_ATTEMPTS;
