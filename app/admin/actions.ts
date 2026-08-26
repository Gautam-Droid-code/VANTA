"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { siteContentSchema } from "@/lib/contentSchema";
import { contentStore, type SiteContent } from "@/lib/contentStore";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export interface PublishResult {
  ok: boolean;
  error: string | null;
  publishedAt: string | null;
}

/**
 * Persists the admin's draft as the published site content.
 *
 * Two things are deliberately not assumed:
 *
 * 1. **That the caller has a session.** `middleware.ts` covers `/admin` page
 *    navigations, but a Server Action is a POST to an endpoint and is not
 *    something to leave protected by routing alone. The session is re-checked
 *    here, at the point the write actually happens.
 * 2. **That the payload is well-formed.** It is JSON built in the browser.
 *    Being signed in makes a request authenticated, not trustworthy — a
 *    malformed `backdrop` or a rail pointing at a deleted product would reach
 *    the storefront and break it. Validation is what stops that.
 */
export async function publishContent(payload: unknown): Promise<PublishResult> {
  const jar = await cookies();
  const username = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!username) {
    return { ok: false, error: "Your session has expired. Please sign in again.", publishedAt: null };
  }

  const parsed = siteContentSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join(".") ?? "content";
    return {
      ok: false,
      error: `Couldn’t publish — ${where}: ${first?.message ?? "invalid value"}`,
      publishedAt: null,
    };
  }

  try {
    await contentStore.write(parsed.data as SiteContent);
  } catch {
    // The message is deliberately vague: a filesystem path or errno on screen
    // tells a visitor more about the server than it tells the editor.
    return { ok: false, error: "Couldn’t save your changes. Please try again.", publishedAt: null };
  }

  // The storefront is cached; without this the new content wouldn't appear.
  revalidatePath("/");
  revalidatePath("/admin", "layout");

  return { ok: true, error: null, publishedAt: new Date().toISOString() };
}
