/**
 * Server-only. Importing this from a client component is a build error naming
 * this file, rather than a native module silently ending up in the browser
 * bundle — which fails as an unrelated "cannot read properties of undefined"
 * where the component is rendered. Client-safe constants live in
 * `lib/mediaLimits.ts`.
 */
import "server-only";

import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * An uploaded image, after processing. Mirrors the shape `ImagePicker` needs to
 * build a valid `ImageAsset`: `src` plus true intrinsic dimensions.
 */
export interface MediaItem {
  id: string;
  /** Path the storefront and admin load it from. */
  src: string;
  /** Original filename, sanitised — shown in the picker so uploads are findable. */
  label: string;
  width: number;
  height: number;
  bytes: number;
  uploadedAt: string;
}

export interface MediaStore {
  list(): Promise<MediaItem[]>;
  add(item: MediaItem, data: Buffer): Promise<void>;
  remove(id: string): Promise<void>;
  /** Raw bytes for serving. `null` when the id is unknown. */
  readFileById(id: string): Promise<Buffer | null>;
}

/** Where uploads are served from. Handled by `app/media/[id]/route.ts`. */
export const MEDIA_URL_PREFIX = "/media";

const ROOT = process.env.MEDIA_STORE_PATH ?? path.join(process.cwd(), ".content", "uploads");
const MANIFEST = path.join(ROOT, "manifest.json");

/**
 * FILE ADAPTER.
 *
 * Files are stored outside `/public` on purpose. `/public` is a curated,
 * build-time asset directory (README: WebP only, originals in `/assets-src`);
 * runtime-mutable uploads mixed into it would blur that line. Everything the
 * app writes at runtime lives under `.content/` instead, which is gitignored.
 *
 * Same writable-disk caveat as the content store: fine in development and on a
 * normal server, not on a read-only serverless filesystem.
 */
class FileMediaStore implements MediaStore {
  /** Every stored file is `<id>.webp` — see `processUpload`. */
  private filePath(id: string): string {
    return path.join(ROOT, `${id}.webp`);
  }

  async list(): Promise<MediaItem[]> {
    try {
      const raw = await readFile(MANIFEST, "utf8");
      const items = JSON.parse(raw) as MediaItem[];
      // Newest first: the thing you just uploaded should be the first tile.
      return items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async writeManifest(items: MediaItem[]): Promise<void> {
    await mkdir(ROOT, { recursive: true });
    const tmp = `${MANIFEST}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(items, null, 2), "utf8");
    await rename(tmp, MANIFEST);
  }

  async add(item: MediaItem, data: Buffer): Promise<void> {
    await mkdir(ROOT, { recursive: true });
    // File first, manifest second. If this crashes in between, the result is an
    // orphaned file nothing references — wasted bytes, but nothing broken. The
    // reverse order would leave the picker showing an image that 404s.
    await writeFile(this.filePath(item.id), data);
    await this.writeManifest([...(await this.list()), item]);
  }

  async remove(id: string): Promise<void> {
    await this.writeManifest((await this.list()).filter((m) => m.id !== id));
    try {
      await unlink(this.filePath(id));
    } catch (error) {
      // Already gone is the desired end state, not a failure.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async readFileById(id: string): Promise<Buffer | null> {
    // The id is checked against the manifest rather than used to build a path
    // directly, so nothing user-supplied ever reaches the filesystem. Combined
    // with the id format check in the route, traversal is not expressible.
    const known = (await this.list()).some((m) => m.id === id);
    if (!known) return null;
    try {
      return await readFile(this.filePath(id));
    } catch {
      return null;
    }
  }
}

/**
 * Raised when the selected adapter cannot possibly work where it is running.
 *
 * A distinct type so `uploadMedia` can show the operator the real reason
 * instead of its generic "couldn't save that image" — a misconfiguration the
 * admin can fix should never be reported as a transient failure they should
 * retry.
 */
export class MediaStoreConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaStoreConfigError";
  }
}

/**
 * BLOB ADAPTER — Vercel Blob.
 *
 * Chosen over S3/R2 because it needs no second account: creating a store in the
 * project's Storage tab sets `BLOB_READ_WRITE_TOKEN` automatically, which is
 * also the variable this adapter is selected by.
 *
 * The manifest is a blob like any other, mirroring `FileMediaStore`'s
 * `manifest.json`. Blob's own `list()` returns pathname, size and uploadedAt
 * but not intrinsic width and height, and `ImageAsset` requires those — so the
 * metadata has to be stored, not derived. Keeping the same shape in both
 * adapters means `MediaItem` means one thing everywhere.
 *
 * The same last-writer-wins race as the file adapter applies to two uploads
 * landing together. It is not new, the admin is single-operator, and fixing it
 * properly means a real row rather than a JSON document.
 */
class BlobMediaStore implements MediaStore {
  private readonly manifestPath = "media/manifest.json";

  private key(id: string): string {
    return `media/${id}.webp`;
  }

  async list(): Promise<MediaItem[]> {
    const { head } = await import("@vercel/blob");
    try {
      const meta = await head(this.manifestPath);
      const response = await fetch(meta.url, { cache: "no-store" });
      if (!response.ok) return [];
      const items = (await response.json()) as MediaItem[];
      return items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    } catch {
      // No manifest yet: nothing has been uploaded. Same meaning as ENOENT on
      // the file adapter, and the same answer.
      return [];
    }
  }

  private async writeManifest(items: MediaItem[]): Promise<void> {
    const { put } = await import("@vercel/blob");
    await put(this.manifestPath, JSON.stringify(items, null, 2), {
      access: "public",
      contentType: "application/json",
      // Without this the SDK appends a random suffix and the manifest would be
      // a new object every write, leaving the old one orphaned and `head()`
      // pointing at nothing.
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
  }

  async add(item: MediaItem, data: Buffer): Promise<void> {
    const { put } = await import("@vercel/blob");
    // Image first, manifest second — the same ordering as the file adapter, and
    // for the same reason: an orphaned object wastes bytes, whereas a manifest
    // naming an object that does not exist shows the picker a broken tile.
    await put(this.key(item.id), data, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    await this.writeManifest([...(await this.list()), item]);
  }

  async remove(id: string): Promise<void> {
    const { del } = await import("@vercel/blob");
    await this.writeManifest((await this.list()).filter((m) => m.id !== id));
    try {
      await del(this.key(id));
    } catch {
      // Already gone is the desired end state, not a failure.
    }
  }

  async readFileById(id: string): Promise<Buffer | null> {
    // Checked against the manifest first, exactly as the file adapter does, so
    // an id from the URL never reaches storage unvalidated.
    const known = (await this.list()).some((m) => m.id === id);
    if (!known) return null;

    const { head } = await import("@vercel/blob");
    try {
      const meta = await head(this.key(id));
      const response = await fetch(meta.url, { cache: "no-store" });
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }
}

/**
 * Which adapter, and why — the same shape as `describeContentStore()`.
 *
 * §34 added that for the content store after a build-time check passed green
 * having read the wrong thing. Media has the identical failure and a worse
 * consequence: an inferred file adapter on Vercel does not fail, it *succeeds*
 * and then loses the file on the next deploy. Nobody notices for weeks, and by
 * then the image is unrecoverable.
 */
export interface MediaStoreDescription {
  driver: "blob" | "file";
  location: string;
  /** True when `MEDIA_STORE_DRIVER` named it, rather than it being inferred. */
  explicit: boolean;
  /**
   * Set when the selected adapter cannot work where it is running. Non-null is
   * always a misconfiguration, never a degraded-but-acceptable state.
   */
  problem: string | null;
}

export function describeMediaStore(): MediaStoreDescription {
  const explicit = Boolean(process.env.MEDIA_STORE_DRIVER);
  const driver =
    process.env.MEDIA_STORE_DRIVER ?? (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "file");

  if (driver === "blob") {
    return {
      driver: "blob",
      location: "Vercel Blob",
      explicit,
      problem: process.env.BLOB_READ_WRITE_TOKEN
        ? null
        : "MEDIA_STORE_DRIVER=blob but BLOB_READ_WRITE_TOKEN is not set.",
    };
  }

  return {
    driver: "file",
    location: ROOT,
    explicit,
    /**
     * The one combination that is always wrong. Vercel's filesystem is
     * ephemeral, so a write here reports success and is gone on the next
     * deploy. Flagged whether or not the driver was explicit: nobody
     * deliberately wants uploads that disappear.
     */
    problem: process.env.VERCEL
      ? "The file media adapter cannot work on Vercel — its filesystem is ephemeral, " +
        "so uploads succeed and vanish on the next deploy. Create a Blob store and set " +
        "BLOB_READ_WRITE_TOKEN."
      : null,
  };
}

function selectMediaStore(): MediaStore {
  return describeMediaStore().driver === "blob" ? new BlobMediaStore() : new FileMediaStore();
}

export const mediaStore: MediaStore = selectMediaStore();

/**
 * Refuses a write the environment cannot honour, rather than losing it quietly.
 *
 * Called by `uploadMedia` before storing. Throwing here turns a silent
 * data-loss bug into an error message in the picker the operator is already
 * looking at — which is the whole point of §34 applied to media.
 */
export function assertMediaStoreUsable(): void {
  const { problem } = describeMediaStore();
  if (problem) throw new MediaStoreConfigError(problem);
}

/** Ids are generated, never taken from input; this is what the route validates. */
export const MEDIA_ID_PATTERN = /^[0-9a-f]{32}$/;
