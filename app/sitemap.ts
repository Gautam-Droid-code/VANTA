import type { MetadataRoute } from "next";
import { contentStore } from "@/lib/contentStore";
import { leafCategories } from "@/lib/catalogue";
import { policies } from "@/data/policies";
import { siteUrl, siteUrlIsPlaceholder } from "@/lib/siteUrl";

/**
 * The sitemap.
 *
 * Lists exactly the routes that are indexable, which means it is the mirror of
 * the `noindex` decisions in `lib/seo.ts` — `/bag`, `/wishlist`, `/search`,
 * `/checkout`, `/account/*`, `/orders/*` and everything under `/admin` are
 * absent on purpose. A sitemap that advertises a URL whose own metadata says
 * "do not index" gives a crawler two contradictory instructions about the same
 * page, and it is the sitemap that looks wrong.
 *
 * ## `lastModified` is a real timestamp or it is absent
 *
 * Emitting `new Date()` per entry is the common shortcut and it is worse than
 * useless: every fetch claims the whole site changed this instant, so the
 * field carries no signal and crawlers learn to ignore it. Two real sources
 * are used instead:
 *
 * - **Content-derived routes** (home, listings, every product, every
 *   collection) use `contentStore.publishedAt()` — the moment an editor last
 *   pressed Publish, which is genuinely when those pages last changed.
 * - **Policy pages** carry their own `updated` string, which is a date a human
 *   maintains and which is shown on the page itself.
 *
 * When neither is available the field is omitted rather than guessed.
 *
 * ## Placeholder host
 *
 * Same guard as `app/robots.ts`. With no `NEXT_PUBLIC_SITE_URL` the only URL
 * this can build is `http://localhost:3000`, and a sitemap full of localhost is
 * actively harmful — it is a crawlable assertion that those are the canonical
 * addresses. An empty sitemap is the honest answer.
 */
export const dynamic = "force-dynamic";

/**
 * Parses "Last updated 28 August 2026" into a Date.
 *
 * Tolerant by design: this is editorial copy, and a sitemap is not worth
 * breaking a build over. An unparseable string yields null and the entry
 * simply carries no `lastModified`.
 */
function parseUpdated(updated: string): Date | null {
  const match = updated.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;
  const parsed = new Date(`${match[1]} ${match[2]} ${match[3]} UTC`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (siteUrlIsPlaceholder) return [];

  const [{ homepage, products }, publishedAt] = await Promise.all([
    contentStore.read(),
    contentStore.publishedAt(),
  ]);

  const url = (path: string) => `${siteUrl}${path}`;
  /** Spread into an entry: adds the key only when there is a real date. */
  const when = (date: Date | null) => (date ? { lastModified: date } : {});

  /**
   * `priority` and `changeFrequency` are deliberately sparse. Google has said
   * for years that it ignores both, and inventing a hierarchy of made-up
   * numbers across 60 URLs adds bytes and no information. The homepage and the
   * two listings carry one because the relative ordering is at least true.
   */
  const entries: MetadataRoute.Sitemap = [
    { url: url("/"), ...when(publishedAt), changeFrequency: "weekly", priority: 1 },
    { url: url("/products"), ...when(publishedAt), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/collections"), ...when(publishedAt), changeFrequency: "weekly", priority: 0.9 },
  ];

  /**
   * Leaves only — the same rule the homepage rows and `/collections` follow. A
   * group's page shows the same garments as its children's pages, so listing
   * both invites a crawler to treat them as duplicates of each other.
   *
   * The synthetic views (`/collections/new`, `/collections/sale`) are included:
   * they are real, reachable, indexable pages with their own content.
   */
  for (const category of leafCategories(homepage.categories.items)) {
    entries.push({
      url: url(`/collections/${category.id}`),
      ...when(publishedAt),
      changeFrequency: "weekly",
    });
  }
  for (const view of ["new", "sale"] as const) {
    entries.push({ url: url(`/collections/${view}`), ...when(publishedAt), changeFrequency: "daily" });
  }

  for (const product of products) {
    entries.push({
      url: url(`/products/${product.id}`),
      ...when(publishedAt),
      changeFrequency: "weekly",
    });
  }

  for (const policy of policies) {
    entries.push({
      url: url(`/${policy.slug}`),
      ...when(parseUpdated(policy.updated)),
      changeFrequency: "yearly",
      priority: 0.3,
    });
  }

  return entries;
}
