"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, revokeOtherAdminSessions } from "@/lib/adminSession";
import { recordAudit } from "@/lib/auditLog";

/**
 * Session management.
 *
 * Both actions re-establish the caller with `requireAdmin()` and scope every
 * write to that username. The session id arrives from a form, so it is never
 * trusted as authorisation — `revokeAdminSession` is only reached after the
 * row has been confirmed to belong to whoever is asking. A server action is a
 * public endpoint with a hard-to-guess name, not a private one.
 */

export async function revokeSessionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return;

  /**
   * Revoking your own session here would sign you out mid-page with no cookie
   * cleared and no redirect — the browser would keep a cookie naming a dead
   * session and simply start failing. "Sign out" is the control for that, and
   * it does both halves.
   */
  if (sessionId === admin.sessionId) return;

  const { prisma } = await import("@/lib/db");
  const { count } = await prisma.adminSession.updateMany({
    // Scoped by username: an id from a form must not be able to revoke a
    // session belonging to anyone else.
    where: { id: sessionId, username: admin.username, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (count > 0) {
    await recordAudit({
      actor: admin.username,
      action: "admin.session.revoked",
      target: sessionId,
    });
  }

  revalidatePath("/admin/security");
}

export async function revokeAllOtherSessionsAction(): Promise<void> {
  const admin = await requireAdmin();
  const count = await revokeOtherAdminSessions(admin.username, admin.sessionId);

  if (count > 0) {
    await recordAudit({
      actor: admin.username,
      action: "admin.session.revoked_all",
      detail: { revoked: count },
    });
  }

  revalidatePath("/admin/security");
}
