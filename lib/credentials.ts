import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Credential checking. Node runtime only — never import this from middleware.
 *
 * Both the username and the password are compared with `timingSafeEqual`, over
 * SHA-256 digests rather than the raw strings. Hashing first gives both sides a
 * fixed 32-byte length, which matters because `timingSafeEqual` throws on
 * length mismatch — and that throw would itself leak the length of the real
 * secret.
 */

const digest = (value: string): Buffer => createHash("sha256").update(value, "utf8").digest();

function safeEquals(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

export interface CredentialCheck {
  ok: boolean;
  /** True when the server is missing its configuration, not when the user is wrong. */
  misconfigured: boolean;
}

export function verifyCredentials(username: string, password: string): CredentialCheck {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return { ok: false, misconfigured: true };
  }

  // Always evaluate both comparisons so the work done doesn't depend on
  // whether the username happened to match.
  const userOk = safeEquals(username, expectedUser);
  const passOk = safeEquals(password, expectedPass);

  return { ok: userOk && passOk, misconfigured: false };
}
