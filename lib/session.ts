import { SignJWT, jwtVerify } from "jose";

/**
 * Session token handling.
 *
 * Deliberately `jose`-only and free of `node:` imports so this module can be
 * used from middleware, which runs on the Edge runtime. Anything needing
 * Node crypto lives in `lib/credentials.ts` instead.
 */

export const SESSION_COOKIE = "vanta_admin_session";

/** 7 days, in seconds. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const ISSUER = "vanta-admin";
const AUDIENCE = "vanta-admin";

function secretKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Fail loudly: a short or missing secret silently weakens every session.
    throw new Error(
      "ADMIN_SESSION_SECRET is missing or shorter than 32 characters. See .env.local.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Returns the username, or null if the token is missing/invalid/expired. */
export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
