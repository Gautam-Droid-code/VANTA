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
 * Rejects a token that has already been accepted here.
 *
 * Cloudflare documents tokens as single-use and returns `timeout-or-duplicate`
 * on reuse — but "documented as" is not "enforced by us". If siteverify ever
 * softens, or a response is replayed within whatever window it allows, the
 * only thing that stops one solved challenge being used a thousand times is a
 * record on our side. Reuse of the rate-limit table would need a second
 * meaning for its columns, so this borrows the audit log's job instead: a
 * dedicated row keyed on the token hash.
 *
 * Without a database this returns "not seen": the customer forms are allowed to
 * run captcha-free in development, and the admin login refuses on its own if
 * the pieces it needs are missing.
 */
async function alreadyRedeemed(token: string): Promise<boolean> {
  if (!hasDatabase()) return false;

  // The token is a bearer credential for one challenge. Storing a digest keeps
  // the log free of anything replayable, the same rule customer sessions follow.
  const { createHash } = await import("node:crypto");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");

  try {
    await prisma.rateLimitBucket.create({
      data: {
        key: `turnstile:token:${tokenHash}`,
        // Locked far into the future: this row is a "seen" marker, and the
        // lockout column is what stops `pruneRateLimits` clearing it early.
        lockedUntil: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return false;
  } catch {
    // The unique primary key rejected it, so this token has been here before.
    return true;
  }
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

  if (await alreadyRedeemed(token)) return { ok: false, reason: "token-reused" };

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

    if (!response.ok) return { ok: false, reason: `http-${response.status}` };

    const result = (await response.json()) as SiteverifyResponse;
    if (result.success) return { ok: true };

    return { ok: false, reason: result["error-codes"]?.join(",") || "rejected" };
  } catch {
    /**
     * Cloudflare unreachable, or slower than the timeout.
     *
     * Fails closed. A captcha that waves everything through the moment it
     * cannot reach its verifier is a captcha an attacker can disable by making
     * one host unreachable — and the forms behind this one either write to the
     * database or hand out an admin session.
     */
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
