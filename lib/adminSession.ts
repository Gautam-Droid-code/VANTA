import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { hasDatabase, prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, verifySessionToken } from "@/lib/session";

/**
 * Admin sessions, as rows.
 *
 * §17 accepted that the admin's JWT could not be revoked, because there was no
 * database to revoke against. There is now, and this closes it without giving
 * up the cheap Edge check.
 *
 * The split, which is the whole point:
 *
 * - `middleware.ts` verifies the token's **signature** on the Edge. It opens no
 *   connection, so it cannot know whether the session was revoked. Its job is
 *   to stop a signed-out URL rendering admin markup before it redirects.
 *   **Middleware is not authorization.**
 * - This module verifies the **row** on the Node runtime: present, not revoked,
 *   not expired. Every admin page and every admin action calls `requireAdmin()`
 *   before doing anything, so a revoked session's still-valid token is worth
 *   nothing the moment it tries to act.
 *
 * Putting the row check in middleware instead would mean a database round trip
 * on every asset and every navigation, from a runtime that cannot hold a
 * connection pool.
 */

export interface AdminIdentity {
  username: string;
  sessionId: string;
}

/**
 * How stale a session's `lastSeenAt` may get before it is written again.
 *
 * Sliding expiry without this would mean an UPDATE on every request, including
 * every image and every prefetch. Five minutes of drift on a "last seen"
 * column costs nothing and removes almost all of those writes.
 */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Idle timeout, distinct from the token's own seven-day life.
 *
 * A session actively in use is extended on each touch; one left alone dies
 * here. That is the difference between "signed in for a week" and "signed in
 * for a week after you last did anything", and only the second is a session
 * someone would recognise as theirs.
 */
const IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

async function requestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0].trim() ?? headerList.get("x-real-ip") ?? null,
    userAgent: headerList.get("user-agent")?.slice(0, 255) ?? null,
  };
}

/**
 * The signed-in administrator, or null.
 *
 * Memoised per render pass with React's `cache`, so a layout, a page and three
 * components asking the same question cost one query. The memo is per-request:
 * a revocation in one request cannot be served from another's.
 */
export const getAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = await verifySessionToken(token);
  if (!claims) return null;

  /**
   * With no database there is no row to check, so the token is all there is.
   *
   * That is the §17 behaviour exactly — unrevocable, but working. Refusing
   * instead would mean the admin stopped functioning the moment Postgres was
   * unreachable, which is worse than the guarantee it would be protecting.
   */
  if (!hasDatabase()) return { username: claims.username, sessionId: claims.sessionId };

  const session = await prisma.adminSession.findUnique({
    where: { id: claims.sessionId },
    select: {
      username: true,
      revokedAt: true,
      expiresAt: true,
      lastSeenAt: true,
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (Date.now() - session.lastSeenAt.getTime() > IDLE_TIMEOUT_MS) return null;

  /**
   * The username is taken from the row, not the token. They cannot disagree
   * today, but the row is the record and the token is a copy of it — reading
   * the copy is how the two quietly drift apart later.
   */
  if (session.username !== claims.username) return null;

  return { username: session.username, sessionId: claims.sessionId };
});

/**
 * Extends a session that is in use.
 *
 * Separate from `getAdmin` because that one is memoised and called from
 * rendering, where a write does not belong — Next may render a component more
 * than once, and a cached read that writes is a surprise. The dashboard layout
 * calls this once per navigation.
 */
export async function touchAdminSession(sessionId: string): Promise<void> {
  if (!hasDatabase()) return;
  try {
    const now = new Date();
    await prisma.adminSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
        lastSeenAt: { lt: new Date(now.getTime() - TOUCH_INTERVAL_MS) },
      },
      data: {
        lastSeenAt: now,
        // Sliding expiry: continued use pushes the hard expiry out too.
        expiresAt: new Date(now.getTime() + SESSION_MAX_AGE * 1000),
      },
    });
  } catch {
    // A failed heartbeat must not break the page it was rendering.
  }
}

/** Throws for callers with no meaning signed out — every admin server action. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not signed in.");
  return admin;
}

export async function createAdminSession(username: string): Promise<string> {
  if (!hasDatabase()) {
    /**
     * No database: mint an id the token can carry so its shape never changes
     * between configurations. Nothing will look it up, which is the §17
     * behaviour — a session that works and cannot be revoked.
     */
    const { randomUUID } = await import("node:crypto");
    return randomUUID();
  }

  const { ip, userAgent } = await requestContext();
  const session = await prisma.adminSession.create({
    data: {
      username,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      ip,
      userAgent,
    },
    select: { id: true },
  });
  return session.id;
}

/**
 * Marks a session revoked rather than deleting it.
 *
 * "Signed out at 14:02 from this address" stays answerable afterwards; a delete
 * erases the evidence at exactly the moment someone is trying to work out what
 * happened.
 */
export async function revokeAdminSession(sessionId: string): Promise<void> {
  if (!hasDatabase()) return;
  await prisma.adminSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Signs out every other browser, keeping the one asking. Returns the count. */
export async function revokeOtherAdminSessions(
  username: string,
  keepSessionId: string,
): Promise<number> {
  if (!hasDatabase()) return 0;
  const { count } = await prisma.adminSession.updateMany({
    where: { username, revokedAt: null, id: { not: keepSessionId } },
    data: { revokedAt: new Date() },
  });
  return count;
}

export interface AdminSessionRow {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ip: string | null;
  /** True for the browser reading the list — it must not offer to revoke itself. */
  current: boolean;
}

/** Active sessions, newest activity first. Revoked and expired ones are hidden. */
export async function listAdminSessions(
  username: string,
  currentSessionId: string,
): Promise<AdminSessionRow[]> {
  if (!hasDatabase()) return [];
  const rows = await prisma.adminSession.findMany({
    where: { username, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    take: 50,
  });
  return rows.map((row) => ({ ...row, current: row.id === currentSessionId }));
}

/** Clears sessions nothing can use. Call from a cron route, not a request. */
export async function pruneAdminSessions(): Promise<number> {
  if (!hasDatabase()) return 0;
  const { count } = await prisma.adminSession.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  });
  return count;
}
