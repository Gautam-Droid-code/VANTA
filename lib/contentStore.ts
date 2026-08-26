import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
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
export interface ContentStore {
  read(): Promise<SiteContent>;
  write(next: SiteContent): Promise<void>;
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
  constructor(private readonly file: string) {}

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
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
    await rename(tmp, this.file);
  }
}

/**
 * Kept outside `/data` so it is never confused with the seed modules, and
 * outside `/public` so it is never served. Override with CONTENT_STORE_PATH.
 */
const STORE_PATH =
  process.env.CONTENT_STORE_PATH ?? path.join(process.cwd(), ".content", "site.json");

export const contentStore: ContentStore = new FileContentStore(STORE_PATH);
