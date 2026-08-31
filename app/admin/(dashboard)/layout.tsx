import { AdminDraftProvider } from "@/components/admin/AdminDraftProvider";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { contentStore } from "@/lib/contentStore";
import { mediaStore } from "@/lib/mediaStore";
import { getAdmin, touchAdminSession } from "@/lib/adminSession";

/**
 * Dashboard chrome. Everything under this group is behind the session check in
 * `middleware.ts`; `/admin/login` sits outside the group so it renders without
 * the sidebar and without requiring a session.
 *
 * The published content is read here, on the server, and handed to the draft
 * provider as its starting point. Reading it once at the layout means every
 * editor page below shares one baseline rather than each fetching its own.
 */

/**
 * Never prerendered. `contentStore.read()` is a filesystem read, which Next
 * cannot see as dynamic, so without this the admin would be built once and then
 * show whatever the content was at build time. An editing tool showing stale
 * data is worse than a slow one — it would silently overwrite newer content on
 * the next publish.
 *
 * This used to add that "the storefront is the opposite case and stays static
 * on purpose". That is no longer true. The root layout calls `getCustomer()`,
 * and `cookies()` is a request-time API, so the whole app renders at request
 * time — `app/layout.tsx` says so in its own comment.
 *
 * Worth keeping the correction rather than deleting the sentence, because the
 * coupling is conditional and that is the trap: with no `DATABASE_URL`,
 * `getCustomer()` returns before it reaches `cookies()`, so the same code
 * prerenders statically. §26 records how that silently made `/checkout`,
 * `/account` and `/orders/*` static. The lesson is that a route's rendering
 * mode should be declared, as it is on this line, not inferred from whether
 * some function happened to touch a request API.
 */
export const dynamic = "force-dynamic";
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * The real authorization check for every page in this group.
   *
   * `middleware.ts` has already checked the token's signature, but it runs on
   * the Edge and cannot see whether the session was revoked. This does, and it
   * runs before any page below renders — so revoking a session takes effect on
   * the revoked browser's very next navigation rather than in seven days.
   */
  /**
   * Redirected to `/admin/signed-out`, not straight to `/admin/login`.
   *
   * Going to the login form directly is what produced an infinite loop: the
   * token is still validly signed, so middleware bounces `/admin/login` back
   * to `/admin`, and this check sends it to the login form again. The route
   * handler clears the cookie first, which is the thing neither this layout
   * nor middleware can do. See `app/admin/signed-out/route.ts`.
   */
  const admin = await getAdmin();
  if (!admin) redirect("/admin/signed-out");

  // Sliding expiry. Debounced inside, so this is a no-op on most navigations.
  await touchAdminSession(admin.sessionId);

  const [initial, initialMedia, initialDraft] = await Promise.all([
    contentStore.read(),
    mediaStore.list(),
    contentStore.readDraft(),
  ]);

  return (
    <AdminDraftProvider
      initial={initial}
      initialMedia={initialMedia}
      initialDraft={initialDraft}
    >
      <AdminShell>{children}</AdminShell>
    </AdminDraftProvider>
  );
}
