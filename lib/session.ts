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

/**
 * What middleware can learn from the cookie alone, with no database.
 *
 * `sid` is the row in `AdminSession`. The token proves the server issued it;
 * only the row can say whether it is still valid, and checking that is
 * `lib/adminSession.ts`'s job on the Node runtime.
 */
export interface AdminTokenClaims {
  username: string;
  sessionId: string;
}

export async function createSessionToken(
  username: string,
  sessionId: string,
): Promise<string> {
  return new SignJWT({ sub: username, sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/**
 * Checks the signature and returns the claims, or null.
 *
 * **This is not authorization.** It proves the cookie was issued by this server
 * and has not expired — nothing more. A session revoked five minutes ago still
 * passes here, because the answer to "was it revoked" is a row and this module
 * must stay free of `node:` imports so middleware can run it on the Edge.
 *
 * Middleware uses it to avoid rendering admin markup for an obvious stranger.
 * Everything that actually does something calls `requireAdmin()` from
 * `lib/adminSession.ts`, which checks the row.
 */
export async function verifySessionToken(
  token: string | undefined,
): Promise<AdminTokenClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
    return { username: payload.sub, sessionId: payload.sid };
  } catch {
    return null;
  }
}

/**
 * Cookie attributes, in one place so the login action and the sign-out path
 * cannot drift apart.
 *
 * `sameSite: "strict"` where the customer session uses `lax`. The admin has no
 * cross-site entry point — nobody links into it, and there is no OAuth callback
 * to come back from — so the looser setting would buy nothing and would leave
 * the cookie attached to top-level navigations originating elsewhere.
 *
 * `path: "/admin"` rather than `/`: the storefront has no use for this cookie,
 * and not sending it on every product page request is one less place it can
 * leak from.
 */
export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/admin",
  maxAge: SESSION_MAX_AGE,
} as const;

/**
 * How to *clear* that cookie — and the only correct way to do it.
 *
 * A browser matches a deletion against name **and path**. `delete("name")`
 * defaults to path `/`, which does not match a cookie set at `/admin`, so the
 * cookie survives and the browser keeps sending it.
 *
 * That produced a genuine infinite redirect loop on sign-out: the row was
 * revoked but the JWT was still in the browser, so middleware saw a valid
 * signature and sent `/admin/login` → `/admin`, the dashboard layout checked
 * the row and sent `/admin` → `/admin/login`, forever. Not an auth hole — the
 * revoked row meant nothing could be done — but the admin was unusable until
 * the cookie was cleared by hand.
 *
 * The real defect was that the set lived here and the clears lived as bare
 * literals in `middleware.ts` and `logoutAction`. Two copies of a value that
 * must agree will drift; that is what happened, and repeating the fix as
 * another matching literal would let it happen again. So the path is derived
 * from the options above rather than restated, and both callers use this.
 *
 * Shaped as an object with `name` because that is the form both
 * `cookies().delete()` and `NextResponse.cookies.delete()` accept.
 */
export const ADMIN_COOKIE_CLEAR = {
  name: SESSION_COOKIE,
  path: ADMIN_COOKIE_OPTIONS.path,
} as const;
