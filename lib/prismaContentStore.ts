import "server-only";

import { prisma } from "@/lib/db";
import type { ContentStore, DraftRecord, SiteContent } from "@/lib/contentStore";

/**
 * POSTGRES ADAPTER — the second implementation of `ContentStore`.
 *
 * It exists because the file adapter needs a writable disk and Vercel does not
 * have one. Everything the seam promised holds: no route, component or editor
 * changes, and the two adapters are interchangeable at the point of
 * construction in `lib/contentStore.ts`.
 *
 * The document is stored whole, in a `Json` column, exactly as the file adapter
 * stores it whole in a file. Shredding it into tables would put the schema in
 * two places — `data/types.ts` and a migration — and every future field would
 * have to be added to both.
 *
 * There is no torn-read problem to defend against here: a row is written
 * atomically, so the retry the file adapter needs has nothing to protect
 * against and is deliberately absent.
 */

const PUBLISHED_KEY = "published";
const DRAFT_KEY = "draft";

export class PrismaContentStore implements ContentStore {
  constructor(
    /**
     * Called when nothing has been published yet, and to fill in top-level
     * keys a stored document predates. Passed in rather than imported so this
     * file does not depend on the file adapter's internals.
     */
    private readonly withDefaults: (stored: Partial<SiteContent>) => SiteContent,
    private readonly seed: () => SiteContent,
  ) {}

  async read(): Promise<SiteContent> {
    const row = await prisma.contentDocument.findUnique({
      where: { key: PUBLISHED_KEY },
      select: { content: true },
    });

    // Nothing published yet: `/data` is the published state, same as a missing
    // file. Note this is *not* a fallback for a failed read — a database error
    // must surface rather than quietly serve the original copy and prices.
    if (!row) return this.seed();

    return this.withDefaults(row.content as unknown as Partial<SiteContent>);
  }

  async write(next: SiteContent): Promise<void> {
    await prisma.contentDocument.upsert({
      where: { key: PUBLISHED_KEY },
      create: { key: PUBLISHED_KEY, content: next as never },
      update: { content: next as never },
    });
  }

  async readDraft(): Promise<DraftRecord | null> {
    const row = await prisma.contentDocument.findUnique({
      where: { key: DRAFT_KEY },
      select: { content: true, savedAt: true },
    });
    if (!row) return null;

    return {
      content: this.withDefaults(row.content as unknown as Partial<SiteContent>),
      savedAt: row.savedAt.toISOString(),
    };
  }

  async writeDraft(next: SiteContent): Promise<DraftRecord> {
    const row = await prisma.contentDocument.upsert({
      where: { key: DRAFT_KEY },
      create: { key: DRAFT_KEY, content: next as never },
      update: { content: next as never },
      select: { savedAt: true },
    });
    return { content: next, savedAt: row.savedAt.toISOString() };
  }

  async clearDraft(): Promise<void> {
    // `deleteMany`, so discarding a draft that is already gone is a no-op
    // rather than a record-not-found error.
    await prisma.contentDocument.deleteMany({ where: { key: DRAFT_KEY } });
  }
}
