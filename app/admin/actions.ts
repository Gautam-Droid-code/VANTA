"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { siteContentSchema } from "@/lib/contentSchema";
import { contentStore, type SiteContent } from "@/lib/contentStore";
import { mediaStore, type MediaItem } from "@/lib/mediaStore";
import { processUpload } from "@/lib/processUpload";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Shared by every action here: no valid session, no work. */
async function requireSession(): Promise<string | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

const EXPIRED = "Your session has expired. Please sign in again.";

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
  if (!(await requireSession())) {
    return { ok: false, error: EXPIRED, publishedAt: null };
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


export type UploadResult =
  | { ok: true; item: MediaItem; error: null }
  | { ok: false; item: null; error: string };

/**
 * Accepts one image file from the media picker.
 *
 * The session check matters more here than on most actions: this one writes
 * attacker-influenced bytes to disk and then serves them back from our own
 * origin. `processUpload` is what makes those bytes safe — it decodes, rejects
 * anything that isn't a supported raster format, and re-encodes to WebP, so
 * nothing of the original file's container survives to be served.
 */
export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  if (!(await requireSession())) {
    return { ok: false, item: null, error: EXPIRED };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, item: null, error: "No file was received." };
  }

  const processed = await processUpload(file);
  if (!processed.ok) {
    return { ok: false, item: null, error: processed.error };
  }

  try {
    await mediaStore.add(processed.value.item, processed.value.data);
  } catch {
    return { ok: false, item: null, error: "Couldn’t save that image. Please try again." };
  }

  return { ok: true, item: processed.value.item, error: null };
}

/**
 * Removes an upload from the library.
 *
 * It does NOT check whether the image is still referenced by published content:
 * doing so would need a full content scan on every delete, and the honest
 * answer is that a reference can be added a moment later anyway. The picker
 * warns instead, and a missing image degrades to a broken tile rather than a
 * broken page.
 */
export async function deleteMedia(id: string): Promise<{ ok: boolean; error: string | null }> {
  if (!(await requireSession())) return { ok: false, error: EXPIRED };

  try {
    await mediaStore.remove(id);
  } catch {
    return { ok: false, error: "Couldn’t delete that image. Please try again." };
  }
  return { ok: true, error: null };
}
