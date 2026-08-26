"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/credentials";
import { checkRateLimit, clearAttempts, recordFailure } from "@/lib/rateLimit";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/session";

export interface LoginState {
  error: string | null;
}

/**
 * One generic message for every credential failure. It never says which field
 * was wrong, and never distinguishes "no such user" from "wrong password" —
 * either would confirm a valid username to an attacker.
 */
const GENERIC_ERROR = "That username or password isn’t right. Please try again.";

/** Best-effort client identity for rate limiting. */
async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const key = await clientKey();

  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      error: `Too many failed attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const result = verifyCredentials(username, password);

  if (result.misconfigured) {
    // Distinct from a wrong password: the server has no credentials set.
    return {
      error: "Sign-in isn’t available right now. Please contact your site administrator.",
    };
  }

  if (!result.ok) {
    const after = recordFailure(key);
    if (!after.allowed) {
      const minutes = Math.ceil(after.retryAfterSeconds / 60);
      return {
        error: `Too many failed attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      };
    }
    return { error: GENERIC_ERROR };
  }

  clearAttempts(key);

  const token = await createSessionToken(username);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
