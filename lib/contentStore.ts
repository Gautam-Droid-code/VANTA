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
import { collectionPage as seedCollectionPage } from "@/data/collectionPage";
import { products as seedProducts } from "@/data/products";
import { PrismaContentStore } from "@/lib/prismaContentStore";
import type { CollectionPageContent, HomepageContent, Product } from "@/data/types";

/**
 * The published site content, and the only thing either surface reads.
 *
 * `categories` is not a member: it lives inside `HomepageContent.categories`
 * already, and duplicating it here would give the same data two homes.
 */
export interface SiteContent {
  homepage: HomepageContent;
  /** Shared by every collection page and the collections index. */
  collectionPage: CollectionPageContent;
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
  return structuredClone({
    homepage: seedHomepage,
    collectionPage: seedCollectionPage,
    products: seedProducts,
  });
}

/**
 * Fills in top-level keys a stored document predates.
 *
 * The store is a document written by an earlier version of this code, so it
 * can be missing a section the schema has since grown — as it was when
 * `collectionPage` was added. Merging the seed for what is absent means the
 * schema can gain a section without a hand-run migration, and without the
 * admin refusing to load until someone performs one.
 *
 * Only whole missing keys are filled. Anything present is left exactly as
 * stored, so this can never quietly overwrite published content.
 */
function withDefaults(stored: Partial<SiteContent>): SiteContent {
  const seed = seedContent();
  return {
    homepage: stored.homepage ?? seed.homepage,
    collectionPage: stored.collectionPage ?? seed.collectionPage,
    products: stored.products ?? seed.products,
  };
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
    /**
     * Retried, with a short backoff, on a parse failure.
     *
     * A truncated read parses as a SyntaxError, and one bad read would 500
     * every storefront page at once. Writes are temp-file-then-rename, and
     * rename is atomic, so a reader should never see a partial document — this
     * is insurance against the case where that reasoning is wrong, not a fix
     * for an observed fault.
     *
     * Worth recording, because it was originally added for the wrong reason:
     * "Unexpected end of JSON input" appears on `next dev` when several routes
     * compile at once on a cold start, and it looked exactly like a torn read
     * of this file. It is not. Instrumenting every read showed all 33 of them
     * returning the full document while a page still 500'd, and the same
     * concurrent requests against a production build never fail. It is
     * Turbopack parsing its own dev manifests, and nothing here can fix it.
     *
     * Bounded, not a loop: a genuinely corrupt file must still surface rather
     * than be masked by retrying forever. It does not fall back to the seed —
     * that would serve the original copy and prices as though nothing had ever
     * been published.
     */
    const RETRY_DELAYS_MS = [25, 75];

    for (let attempt = 0; ; attempt++) {
      try {
        const raw = await readFile(this.file, "utf8");
        return withDefaults(JSON.parse(raw) as Partial<SiteContent>);
      } catch (error) {
        // First run: nothing written yet, so `/data` is the published state.
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return seedContent();
        if (attempt < RETRY_DELAYS_MS.length && error instanceof SyntaxError) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
          continue;
        }
        throw error;
      }
    }
  }

  async write(next: SiteContent): Promise<void> {
    await this.atomicWrite(this.file, JSON.stringify(next, null, 2));
  }

  async readDraft(): Promise<DraftRecord | null> {
    try {
      const record = JSON.parse(await readFile(this.draftFile, "utf8")) as DraftRecord;
      return { ...record, content: withDefaults(record.content) };
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

/**
 * Which adapter runs.
 *
 * Postgres as soon as there is a database, because the host that needs a
 * database is also the host without a writable disk — a project with
 * DATABASE_URL set and the file adapter still selected would work perfectly in
 * development and fail on its first publish in production, which is the worst
 * possible time to find out.
 *
 * `CONTENT_STORE_DRIVER` overrides the choice in both directions, for the case
 * where the database exists for accounts but the content should stay on disk.
 *
 * Switching drivers does not move anything: the two stores are separate
 * places. Run `npm run content:import` once to copy a published `.content`
 * document into Postgres, or the site falls back to the `/data` seed and looks
 * as though every edit was lost.
 */
function selectStore(): ContentStore {
  const driver =
    process.env.CONTENT_STORE_DRIVER ?? (process.env.DATABASE_URL ? "postgres" : "file");

  if (driver === "postgres") {
    return new PrismaContentStore(withDefaults, seedContent);
  }

  return new FileContentStore(STORE_PATH, DRAFT_PATH);
}

export const contentStore: ContentStore = selectStore();
