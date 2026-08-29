import "server-only";

import { hasDatabase, prisma } from "@/lib/db";

/**
 * Login rate limiting, in Postgres.
 *
 * This was a module-level `Map` (§17). On a serverless host every request can
 * be a fresh process, so the Map reset constantly and the effective limit was
 * "five attempts per instance" — against `/admin/login`, which is the only
 * thing between a stranger and an unlimited password-guessing loop, that is
 * barely a limit. A shared table is the smallest thing that actually counts.
 *
 * Deliberately not Redis or Vercel KV, which §17 suggested. There is already a
 * Postgres connection open for everything else, and adding a second datastore
 * for six columns means a second thing to provision, a second thing to fail,
 * and a second place for the answer to live. The write volume here is a handful
 * of rows per failed login.
 *
 * Every function is async now, where the Map versions were synchronous. That is
 * the one shape change callers see; the names and return types are unchanged.
 */

/** Failures allowed inside a window before the key is locked out. */
const MAX_ATTEMPTS = 5;

/** Attempts older than this are forgotten. */
const WINDOW_MS = 15 * 60 * 1000;

/** First lockout. Doubles each time, capped — see `lockoutMs`. */
const BASE_LOCKOUT_MS = 10 * 60 * 1000;
const MAX_LOCKOUT_MS = 24 * 60 * 60 * 1000;

/**
 * Exponential backoff.
 *
 * A fixed ten minutes is a rate limiter an attacker can simply wait out
 * forever, five guesses at a time. Doubling means a script that keeps trying
 * puts itself out of action for a day, while a person who mistyped their
 * password twice this month never notices the difference.
 */
function lockoutMs(lockoutCount: number): number {
  return Math.min(BASE_LOCKOUT_MS * 2 ** Math.max(0, lockoutCount), MAX_LOCKOUT_MS);
}

export interface RateLimitState {
  allowed: boolean;
  /** Seconds remaining on the lockout, when blocked. */
  retryAfterSeconds: number;
  remainingAttempts: number;
}

const ALLOWED: RateLimitState = {
  allowed: true,
  retryAfterSeconds: 0,
  remainingAttempts: MAX_ATTEMPTS,
};

/**
 * What to do when the limiter itself fails — the database is unreachable, a
 * query times out.
 *
 * The right answer is different for each caller, and getting it backwards is
 * worse than having no limiter:
 *
 * - **`closed`** for the admin login. If the counter cannot be read, an attempt
 *   is refused. There is one administrator, they can wait, and the alternative
 *   is that anyone who can knock the database over has also removed the only
 *   brute-force control on the account that can rewrite the site.
 *
 * - **`open`** for customer sign-in and registration. A shopper locked out by a
 *   database blip is a lost sale and a support message, and the thing being
 *   protected — one person's account, behind a scrypt hash — is worth less than
 *   the storefront staying usable.
 */
export type FailMode = "open" | "closed";

const BLOCKED = (seconds: number): RateLimitState => ({
  allowed: false,
  retryAfterSeconds: seconds,
  remainingAttempts: 0,
});

/**
 * With no database configured there is no shared counter to keep.
 *
 * Returning "allowed" is right for the customer forms — the site is designed to
 * run without Postgres. The admin login does not rely on it: `checkRateLimit`
 * is only half of that story, and `app/admin/login/actions.ts` refuses to sign
 * anyone in at all when the pieces it needs are missing.
 */
function noDatabaseState(): RateLimitState {
  return ALLOWED;
}

/** Reads the current state without recording anything. */
export async function checkRateLimit(
  key: string,
  failMode: FailMode = "open",
): Promise<RateLimitState> {
  if (!hasDatabase()) return noDatabaseState();

  try {
    const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
    if (!bucket) return ALLOWED;

    const now = Date.now();

    if (bucket.lockedUntil && bucket.lockedUntil.getTime() > now) {
      return BLOCKED(Math.ceil((bucket.lockedUntil.getTime() - now) / 1000));
    }

    // Window elapsed, or a lockout that has run out: the slate is clean. The
    // row is left alone rather than reset here — a read path that writes turns
    // every check into a transaction, and `recordFailure` resets it anyway.
    if (now - bucket.windowStartedAt.getTime() >= WINDOW_MS) return ALLOWED;

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - bucket.failures),
    };
  } catch {
    return failMode === "closed" ? BLOCKED(60) : ALLOWED;
  }
}

/** Records a failed attempt and returns the state *after* recording it. */
export async function recordFailure(
  key: string,
  failMode: FailMode = "open",
): Promise<RateLimitState> {
  if (!hasDatabase()) return noDatabaseState();

  const now = new Date();

  try {
    const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });

    const windowExpired =
      !existing || now.getTime() - existing.windowStartedAt.getTime() >= WINDOW_MS;
    const lockoutExpired =
      existing?.lockedUntil !== null &&
      existing?.lockedUntil !== undefined &&
      existing.lockedUntil.getTime() <= now.getTime();

    // A fresh window starts when the old one aged out, or when a lockout has
    // just been served. `lockoutCount` deliberately survives both, or the
    // backoff would reset every time and never actually escalate.
    const startingFresh = windowExpired || lockoutExpired;
    const failures = (startingFresh ? 0 : (existing?.failures ?? 0)) + 1;
    const lockoutCount = existing?.lockoutCount ?? 0;

    if (failures >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + lockoutMs(lockoutCount));
      await prisma.rateLimitBucket.upsert({
        where: { key },
        create: {
          key,
          failures,
          windowStartedAt: now,
          lockedUntil,
          lockoutCount: lockoutCount + 1,
        },
        update: {
          failures,
          windowStartedAt: startingFresh ? now : undefined,
          lockedUntil,
          lockoutCount: lockoutCount + 1,
        },
      });
      return BLOCKED(Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
    }

    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, failures, windowStartedAt: now },
      update: {
        failures,
        windowStartedAt: startingFresh ? now : undefined,
        lockedUntil: null,
      },
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - failures),
    };
  } catch {
    return failMode === "closed" ? BLOCKED(60) : ALLOWED;
  }
}

/**
 * Clears a key after a success.
 *
 * Failures are swallowed on purpose: this runs after credentials have already
 * been accepted, and refusing a valid sign-in because a cleanup delete failed
 * would be the limiter causing the outage it exists to prevent.
 */
export async function clearAttempts(key: string): Promise<void> {
  if (!hasDatabase()) return;
  try {
    await prisma.rateLimitBucket.deleteMany({ where: { key } });
  } catch {
    // Deliberately ignored — see above.
  }
}

/**
 * Checks several keys at once and returns the most restrictive answer.
 *
 * Callers limit on IP *and* on the identifier being guessed. Both have to pass,
 * and the one with the longest wait is the one worth reporting.
 */
export async function checkAll(
  keys: string[],
  failMode: FailMode = "open",
): Promise<RateLimitState> {
  const states = await Promise.all(keys.map((key) => checkRateLimit(key, failMode)));
  const blocked = states.filter((state) => !state.allowed);
  if (blocked.length > 0) {
    return BLOCKED(Math.max(...blocked.map((state) => state.retryAfterSeconds)));
  }
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.min(...states.map((state) => state.remainingAttempts)),
  };
}

/** Records a failure against every key, returning the most restrictive result. */
export async function recordFailureAll(
  keys: string[],
  failMode: FailMode = "open",
): Promise<RateLimitState> {
  const states = await Promise.all(keys.map((key) => recordFailure(key, failMode)));
  const blocked = states.filter((state) => !state.allowed);
  if (blocked.length > 0) {
    return BLOCKED(Math.max(...blocked.map((state) => state.retryAfterSeconds)));
  }
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.min(...states.map((state) => state.remainingAttempts)),
  };
}

export async function clearAttemptsAll(keys: string[]): Promise<void> {
  await Promise.all(keys.map(clearAttempts));
}

/**
 * Deletes buckets nothing is waiting on.
 *
 * Nothing depends on this for correctness — an expired lockout is already
 * treated as clear on read. It exists so a table fed by every failed login on
 * the internet does not grow without bound. Call it from a cron route, not from
 * a request path.
 *
 * Rows are kept until well past their window so that `lockoutCount`, and with
 * it the backoff, survives a quiet hour.
 */
export async function pruneRateLimits(olderThanMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  if (!hasDatabase()) return 0;
  const cutoff = new Date(Date.now() - olderThanMs);
  const { count } = await prisma.rateLimitBucket.deleteMany({
    where: { updatedAt: { lt: cutoff }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }] },
  });
  return count;
}

export const RATE_LIMIT_MAX_ATTEMPTS = MAX_ATTEMPTS;

/** Key builders, so the `scope:kind:value` shape is written down once. */
export const rateLimitKey = {
  ip: (scope: string, ip: string) => `${scope}:ip:${ip}`,
  /** Lowercased: `Bunny` and `bunny` are one account and must be one bucket. */
  identifier: (scope: string, identifier: string) =>
    `${scope}:id:${identifier.trim().toLowerCase().slice(0, 190)}`,
};
