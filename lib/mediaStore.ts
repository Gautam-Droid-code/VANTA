/**
 * Server-only. Importing this from a client component is a build error naming
 * this file, rather than a native module silently ending up in the browser
 * bundle — which fails as an unrelated "cannot read properties of undefined"
 * where the component is rendered. Client-safe constants live in
 * `lib/mediaLimits.ts`.
 */
import "server-only";

import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
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

export const mediaStore: MediaStore = new FileMediaStore();

/** Ids are generated, never taken from input; this is what the route validates. */
export const MEDIA_ID_PATTERN = /^[0-9a-f]{32}$/;

export async function listOrphanedFiles(): Promise<string[]> {
  try {
    const files = await readdir(ROOT);
    const known = new Set((await mediaStore.list()).map((m) => `${m.id}.webp`));
    return files.filter((f) => f.endsWith(".webp") && !known.has(f));
  } catch {
    return [];
  }
}
