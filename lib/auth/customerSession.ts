import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { hasDatabase, prisma } from "@/lib/db";

/**
 * Customer sessions.
 *
 * Database-backed, unlike the admin's stateless JWT in `lib/session.ts`. The
 * difference is deliberate and worth stating: an admin session is one person
 * on one laptop for seven days, and a signed token that cannot be revoked is
 * an acceptable trade for a middleware check that touches no database. A
 * customer session is a stranger's phone that must be revocable, listable, and
 * able to outlive a laptop lid closing — none of which a stateless token can
 * do.
 *
 * The cookie holds a random opaque token. Only its SHA-256 digest reaches the
 * database, so a stolen dump contains nothing that can be replayed as a login.
 * The token has no structure and means nothing on its own, so there is also
 * nothing in it to tamper with.
 */

export const CUSTOMER_SESSION_COOKIE = "vanta_customer_session";

/** 30 days. A shopping session should survive a fortnight of not shopping. */
export const CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/** 32 random bytes — 256 bits, which is not guessable and not worth stretching. */
const TOKEN_BYTES = 32;

const digest = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

/** What a signed-in page is allowed to see. Never the password hash. */
export interface CustomerIdentity {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
}

/**
 * Issues a session and sets the cookie.
 *
 * Callable only from a Server Function or Route Handler — `cookies().set`
 * needs response headers, which no longer exist once a page has begun
 * streaming.
 */
export async function createCustomerSession(customerId: string): Promise<void> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_MAX_AGE * 1000);

  const headerList = await headers();

  await prisma.customerSession.create({
    data: {
      customerId,
      tokenHash: digest(token),
      expiresAt,
      // Recorded so a customer can recognise their own devices later. Truncated
      // because a user-agent string is attacker-controlled and unbounded.
      userAgent: headerList.get("user-agent")?.slice(0, 255) ?? null,
      ip:
        headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
        headerList.get("x-real-ip") ??
        null,
    },
  });

  const store = await cookies();
  store.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_SESSION_MAX_AGE,
  });
}

/**
 * The signed-in customer, or null.
 *
 * Memoised for the render pass with React's `cache`, so a layout, a page and
 * three components asking the same question cost one query rather than five.
 * The memo is per-request — it is not a cache across requests, and a sign-out
 * in one request cannot be served from another's.
 *
 * Returns null rather than redirecting. Most of the storefront is happy to be
 * browsed signed out; the pages that are not call `requireCustomer()`.
 */
export const getCustomer = cache(async (): Promise<CustomerIdentity | null> => {
  if (!hasDatabase()) return null;

  const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: digest(token) },
    select: {
      expiresAt: true,
      customer: { select: { id: true, email: true, name: true, phone: true } },
    },
  });

  if (!session) return null;

  // Expiry is checked here as well as being a cookie `maxAge`, because the
  // cookie's lifetime is a request from the browser and the browser is not
  // the authority on when a session ends.
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return session.customer;
});

/** Convenience for actions and pages that have no meaning signed out. */
export async function requireCustomer(): Promise<CustomerIdentity> {
  const customer = await getCustomer();
  if (!customer) throw new Error("Not signed in.");
  return customer;
}

/**
 * Deletes this browser's session, row and cookie both.
 *
 * The row goes first. If it were the other way round and the delete failed,
 * the cookie would be gone from the browser while a live session sat in the
 * database with nothing left able to revoke it.
 */
export async function destroyCustomerSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (token && hasDatabase()) {
    // `deleteMany`, not `delete`: signing out of an already-dead session is
    // the desired end state, not a record-not-found error.
    await prisma.customerSession.deleteMany({ where: { tokenHash: digest(token) } });
  }

  store.delete(CUSTOMER_SESSION_COOKIE);
}

/** Signs a customer out of every device — used after a password change. */
export async function destroyAllCustomerSessions(customerId: string): Promise<void> {
  await prisma.customerSession.deleteMany({ where: { customerId } });
}

/**
 * Clears sessions that have already expired.
 *
 * Nothing depends on this for correctness — `getCustomer` rejects an expired
 * row whether or not it has been swept. It exists so the table does not grow
 * without bound. Call it from a cron route, not from a request path.
 */
export async function pruneExpiredSessions(): Promise<number> {
  const { count } = await prisma.customerSession.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return count;
}
