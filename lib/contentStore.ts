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
import { homepage as seedHomepage } from "@/data/homepage";
import { products as seedProducts } from "@/data/products";
import type { HomepageContent, Product } from "@/data/types";

/**
 * The published site content, and the only thing either surface reads.
 *
 * `categories` is not a member: it lives inside `HomepageContent.categories`
 * already, and duplicating it here would give the same data two homes.
 */
export interface SiteContent {
  homepage: HomepageContent;
  products: Product[];
}

/**
 * Storage seam. Everything upstream depends on this interface and nothing else,
 * so moving to Postgres/Redis/a CMS means writing one more adapter — no route,
 * component or editor changes.
 */
/** An in-progress draft, plus when it was last saved. */
export interface DraftRecord {
  content: SiteContent;
  savedAt: string;
}

export interface ContentStore {
  read(): Promise<SiteContent>;
  write(next: SiteContent): Promise<void>;

  /**
   * The unpublished draft, or null when there isn't one.
   *
   * Kept in a separate document from the published content rather than as a
   * flag on it. Published content is what the storefront reads on every
   * request; a draft must not be able to affect it even briefly, and keeping
   * them in one file makes that a matter of care rather than structure.
   */
  readDraft(): Promise<DraftRecord | null>;
  writeDraft(next: SiteContent): Promise<DraftRecord>;
  clearDraft(): Promise<void>;
}

/** The starting state: whatever `/data` currently holds. */
export function seedContent(): SiteContent {
  return structuredClone({ homepage: seedHomepage, products: seedProducts });
}

/**
 * FILE ADAPTER — writes one JSON document next to the project.
 *
 * Chosen because it needs no external service and the whole payload is a few
 * kilobytes. It requires a writable disk, so it works in development and on a
 * normal server or container, but NOT on a read-only serverless filesystem
 * such as Vercel's. Swapping adapters is the intended migration path.
 *
 * Writes go to a temp file and are then renamed. `rename` is atomic on a single
 * filesystem, so a crash mid-write can never leave a half-written document
 * behind — a reader sees either the old file or the new one.
 */
class FileContentStore implements ContentStore {
  constructor(
    private readonly file: string,
    private readonly draftFile: string,
  ) {}

  /** Temp-file-then-rename, so a crash can't leave a truncated document. */
  private async atomicWrite(target: string, body: string): Promise<void> {
    await mkdir(path.dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.tmp`;
    await writeFile(tmp, body, "utf8");
    await rename(tmp, target);
  }

  async read(): Promise<SiteContent> {
    try {
      const raw = await readFile(this.file, "utf8");
      return JSON.parse(raw) as SiteContent;
    } catch (error) {
      // First run: nothing written yet, so `/data` is the published state.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return seedContent();
      throw error;
    }
  }

  async write(next: SiteContent): Promise<void> {
    await this.atomicWrite(this.file, JSON.stringify(next, null, 2));
  }

  async readDraft(): Promise<DraftRecord | null> {
    try {
      return JSON.parse(await readFile(this.draftFile, "utf8")) as DraftRecord;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      // A corrupt draft must not lock the admin out. Published content is
      // intact either way, so the safe move is to behave as if there is no
      // draft rather than to throw on every page load.
      return null;
    }
  }

  async writeDraft(next: SiteContent): Promise<DraftRecord> {
    const record: DraftRecord = { content: next, savedAt: new Date().toISOString() };
    await this.atomicWrite(this.draftFile, JSON.stringify(record, null, 2));
    return record;
  }

  async clearDraft(): Promise<void> {
    try {
      await unlink(this.draftFile);
    } catch (error) {
      // Already gone is the desired end state, not a failure.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

/**
 * Kept outside `/data` so it is never confused with the seed modules, and
 * outside `/public` so it is never served. Override with CONTENT_STORE_PATH.
 */
const STORE_PATH =
  process.env.CONTENT_STORE_PATH ?? path.join(process.cwd(), ".content", "site.json");

/** Sits beside the published document, never inside it. */
const DRAFT_PATH = path.join(path.dirname(STORE_PATH), "draft.json");

export const contentStore: ContentStore = new FileContentStore(STORE_PATH, DRAFT_PATH);
