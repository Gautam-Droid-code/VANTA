"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/credentials";
import {
  checkAll,
  clearAttemptsAll,
  rateLimitKey,
  recordFailureAll,
} from "@/lib/rateLimit";
import { ADMIN_COOKIE_OPTIONS, SESSION_COOKIE, createSessionToken } from "@/lib/session";
import {
  createAdminSession,
  getAdmin,
  revokeAdminSession,
} from "@/lib/adminSession";
import { isTurnstileConfigured, verifyTurnstile, TURNSTILE_FIELD } from "@/lib/turnstile";
import { recordAudit } from "@/lib/auditLog";

export interface LoginState {
  error: string | null;
}

/**
 * One generic message for every credential failure. It never says which field
 * was wrong, and never distinguishes "no such user" from "wrong password" —
 * either would confirm a valid username to an attacker.
 */
const GENERIC_ERROR = "That username or password isn’t right. Please try again.";

/** Rate-limit scope, so admin buckets never collide with customer ones. */
const SCOPE = "admin";

async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() ?? headerList.get("x-real-ip") ?? "unknown";
}

function tooManyAttempts(retryAfterSeconds: number): LoginState {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return {
    error: `Too many failed attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
  };
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const ip = await clientIp();

  /**
   * Two buckets, counted separately.
   *
   * IP alone lets an attacker with a botnet spread guesses thinly enough to
   * never trip it. Identifier alone lets anyone lock the real administrator out
   * of their own account by guessing at their username from anywhere. Both, and
   * the more restrictive answer wins.
   */
  const keys = [
    rateLimitKey.ip(SCOPE, ip),
    rateLimitKey.identifier(SCOPE, username || "unknown"),
  ];

  /**
   * Fails **closed**. If the limiter cannot be read, the attempt is refused.
   *
   * There is one administrator and they can wait a minute. The alternative is
   * that anyone able to make the database unreachable has also removed the only
   * brute-force control on the account that can rewrite the entire site.
   */
  const limit = await checkAll(keys, "closed");
  if (!limit.allowed) return tooManyAttempts(limit.retryAfterSeconds);

  /**
   * Captcha, and the one place it is NOT optional.
   *
   * The customer forms skip verification when Turnstile is unconfigured, so
   * that local development works without a Cloudflare account. This refuses to
   * sign anyone in at all.
   *
   * An admin login that silently drops its captcha the moment an environment
   * variable goes missing is worse than one that never had it: everything keeps
   * working, nothing looks wrong, and the protection is gone until somebody
   * reads the logs months later. A refusal is loud, and an operator who has
   * just deployed without the key finds out immediately.
   */
  if (!isTurnstileConfigured()) {
    return {
      error:
        "Sign-in isn’t available: this server has no captcha configured. Set TURNSTILE_SECRET_KEY.",
    };
  }

  const captcha = await verifyTurnstile(
    String(formData.get(TURNSTILE_FIELD) ?? ""),
    ip === "unknown" ? null : ip,
  );
  if (!captcha.ok) {
    // Counted as a failure: an attacker skipping the widget entirely and
    // posting straight to this action must not get unlimited free attempts
    // simply because they never reached the password check.
    await recordFailureAll(keys, "closed");
    await recordAudit({
      actor: "anonymous",
      action: "admin.signin.failed",
      detail: { stage: "captcha", reason: captcha.reason },
    });
    return { error: "Couldn’t verify that you’re human. Please try again." };
  }

  const result = verifyCredentials(username, password);

  if (result.misconfigured) {
    // Distinct from a wrong password: the server has no credentials set.
    return {
      error: "Sign-in isn’t available right now. Please contact your site administrator.",
    };
  }

  if (!result.ok) {
    const after = await recordFailureAll(keys, "closed");
    await recordAudit({
      actor: "anonymous",
      action: "admin.signin.failed",
      // The attempted username, never the attempted password. Knowing which
      // account was targeted is the point; knowing what was guessed at it would
      // put a near-miss of the real password in a readable table.
      detail: { stage: "credentials", attemptedUsername: username.slice(0, 80) },
    });
    if (!after.allowed) return tooManyAttempts(after.retryAfterSeconds);
    return { error: GENERIC_ERROR };
  }

  await clearAttemptsAll(keys);

  const sessionId = await createAdminSession(username);
  const token = await createSessionToken(username, sessionId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, ADMIN_COOKIE_OPTIONS);

  await recordAudit({ actor: username, action: "admin.signin" });

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  /**
   * Revoke the row before clearing the cookie.
   *
   * The other order leaves a live session in the database with the only thing
   * that could revoke it — the cookie naming its id — already gone from the
   * browser. Signing out would then remove the evidence rather than the access.
   */
  const admin = await getAdmin();
  if (admin) {
    await revokeAdminSession(admin.sessionId);
    await recordAudit({ actor: admin.username, action: "admin.signout" });
  }

  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
