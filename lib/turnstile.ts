import "server-only";

import { randomUUID } from "node:crypto";
import { hasDatabase, prisma } from "@/lib/db";

/**
 * Cloudflare Turnstile verification.
 *
 * The widget renders in the browser and produces a token. That token means
 * nothing until this module asks Cloudflare about it: a form that shows the
 * widget and never verifies server-side is decoration, and an attacker posting
 * directly to the server action never sees the widget at all.
 *
 * Endpoint, parameter names, response fields and error codes are taken from
 * Cloudflare's siteverify reference, not from memory.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** The hidden input the widget writes into the surrounding form. */
export const TURNSTILE_FIELD = "cf-turnstile-response";

/** Cloudflare's own timeout is generous; ours is not. A captcha check must not
 *  be able to hold a login open for a minute. */
const TIMEOUT_MS = 8000;

export interface TurnstileResult {
  ok: boolean;
  /** Machine-readable, for the audit log. Never shown to the visitor. */
  reason?: string;
}

/** Exactly the fields siteverify documents. */
interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Single-use enforcement, in two phases: claim, then keep or release.
 *
 * Cloudflare documents tokens as single-use and returns `timeout-or-duplicate`
 * on reuse — but "documented as" is not "enforced by us". If siteverify ever
 * softens, or a response is replayed within whatever window it allows, the
 * only thing that stops one solved challenge being used a thousand times is a
 * record on our side. Reuse of the rate-limit table would need a second
 * meaning for its columns, so this borrows the audit log's job instead: a
 * dedicated row keyed on the token hash.
 *
 * ## Why two phases and not one
 *
 * This used to be a single step: insert the marker, then ask Cloudflare. That
 * burned the token on any outcome, including the ones where Cloudflare never
 * answered. A timeout or a dropped connection left the marker behind, so the
 * honest visitor's immediate retry — same widget, same token — came back
 * `token-reused`, and the only way forward was to reload the page and solve a
 * new challenge. A network wobble on Cloudflare's side became a dead form on
 * ours.
 *
 * The obvious repair — insert only *after* a successful verification — is
 * worse, because it opens the window this row exists to close: two requests
 * carrying the same token both reach siteverify before either has recorded
 * anything, and if Cloudflare accepts both, both are redeemed.
 *
 * So the claim still happens first and still relies on the unique primary key
 * to make it atomic — one concurrent request wins, the rest are rejected — and
 * it is **released only when we did not get an answer**. A definite "no" from
 * Cloudflare keeps the claim, because that token is spent either way and there
 * is nothing to gain by asking again.
 */
async function tokenKey(token: string): Promise<string> {
  // The token is a bearer credential for one challenge. Storing a digest keeps
  // the log free of anything replayable, the same rule customer sessions follow.
  const { createHash } = await import("node:crypto");
  return `turnstile:token:${createHash("sha256").update(token, "utf8").digest("hex")}`;
}

/**
 * Takes exclusive ownership of a token, or reports that somebody already has.
 *
 * Without a database this always succeeds: the customer forms are allowed to
 * run captcha-free in development, and the admin login refuses on its own if
 * the pieces it needs are missing.
 */
async function claimToken(token: string): Promise<{ claimed: boolean; key: string | null }> {
  if (!hasDatabase()) return { claimed: true, key: null };

  const key = await tokenKey(token);

  try {
    await prisma.rateLimitBucket.create({
      data: {
        key,
        // Locked far into the future: this row is a "seen" marker, and the
        // lockout column is what stops `pruneRateLimits` clearing it early.
        lockedUntil: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return { claimed: true, key };
  } catch {
    // The unique primary key rejected it, so this token has been here before.
    return { claimed: false, key };
  }
}

/**
 * Gives the token back, for the case where Cloudflare never rendered a verdict.
 *
 * Best-effort on purpose. If this delete fails the token stays burned, which is
 * the old behaviour — inconvenient, never unsafe. Failing the sign-in because
 * the *cleanup* failed would trade a rare annoyance for a common one.
 */
async function releaseToken(key: string | null): Promise<void> {
  if (!key || !hasDatabase()) return;
  await prisma.rateLimitBucket.deleteMany({ where: { key } }).catch(() => {});
}

/**
 * Verifies a token with Cloudflare.
 *
 * `remoteip` is sent because Cloudflare uses it as a signal, and omitting it
 * throws away the one piece of context that ties a solved challenge to the
 * machine that solved it. `idempotency_key` is sent so a retried request after
 * a network wobble is not counted as a second redemption of the same token.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: "not-configured" };
  if (!token) return { ok: false, reason: "missing-token" };

  /**
   * Claimed before the network call, so two requests carrying the same token
   * cannot both be verified. The loser is rejected here rather than racing.
   */
  const { claimed, key } = await claimToken(token);
  if (!claimed) return { ok: false, reason: "token-reused" };

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  body.set("idempotency_key", randomUUID());

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Never cached: the whole point is that each token is asked about once.
      cache: "no-store",
    });

    if (!response.ok) {
      // A 5xx from siteverify is Cloudflare failing, not the token failing.
      // Released so the visitor's retry works.
      await releaseToken(key);
      return { ok: false, reason: `http-${response.status}` };
    }

    const result = (await response.json()) as SiteverifyResponse;

    // A verdict either way — the token is spent. The claim becomes the record
    // of that, which is exactly what it is for.
    if (result.success) return { ok: true };

    return { ok: false, reason: result["error-codes"]?.join(",") || "rejected" };
  } catch {
    /**
     * Cloudflare unreachable, or slower than the timeout.
     *
     * Still fails **closed** — the caller is told no. A captcha that waves
     * everything through the moment it cannot reach its verifier is a captcha
     * an attacker can disable by making one host unreachable, and the forms
     * behind this one either write to the database or hand out an admin
     * session.
     *
     * But the token is released. Refusing this attempt is correct; refusing
     * every *subsequent* attempt with the same token is not, because nothing
     * was ever verified and the challenge the visitor solved is still good.
     */
    await releaseToken(key);
    return { ok: false, reason: "verification-unavailable" };
  }
}

/**
 * The customer-facing rule: verify when configured, skip when not.
 *
 * Local development has no Cloudflare keys, and a register form nobody can
 * submit is not a useful development environment.
 *
 * The admin login deliberately does NOT use this — see
 * `app/admin/login/actions.ts`. An admin sign-in that silently drops its
 * captcha the moment an environment variable goes missing is worse than one
 * that never had it, because the failure is invisible: everything keeps
 * working, and nobody finds out until the logs are read after the fact.
 */
export async function verifyTurnstileIfConfigured(
  token: string | undefined | null,
  remoteIp: string | null,
): Promise<TurnstileResult> {
  if (!isTurnstileConfigured()) return { ok: true, reason: "skipped-unconfigured" };
  return verifyTurnstile(token, remoteIp);
}
