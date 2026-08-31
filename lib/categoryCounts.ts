import type { Category, Product } from "@/data/types";

/**
 * How many products are in a category.
 *
 * **Client-safe on purpose** — no `import "server-only"`. The storefront counts
 * on the server, but `/admin/categories` is a client component editing draft
 * state and has to show the same number from the draft's own products. Putting
 * this in `lib/catalogue.ts` (which is server-only) would have meant the admin
 * either duplicating the logic or going without, and duplicating it is how the
 * bug this file exists to fix happened in the first place.
 *
 * Same reasoning as `lib/mediaLimits.ts` and `lib/checkoutSchema.ts`: the rule
 * is shared, the I/O is not.
 */

/** A category and the live number of products in it. */
export interface CountedCategory extends Category {
  count: number;
}

/**
 * The categories a product can actually be in — a group holds none itself.
 *
 * Generic so it can be applied after `withProductCounts` without discarding
 * the count that just got attached.
 */
export function leafCategories<T extends Category>(all: T[]): T[] {
  const parentIds = new Set(all.flatMap((c) => (c.parentId ? [c.parentId] : [])));
  return all.filter((c) => !parentIds.has(c.id));
}

/**
 * A group's own id plus its children's, for matching products.
 *
 * The group's own id is included because the admin permits assigning a product
 * directly to a group. It is unusual, but a product that did so must not be
 * invisible in the count any more than it is on the collection page.
 */
function idsUnder(category: Category, all: Category[]): Set<string> {
  return new Set([category.id, ...all.filter((c) => c.parentId === category.id).map((c) => c.id)]);
}

/**
 * The products in a category, including everything in its children.
 *
 * The single definition of "what is in this category". The collection page,
 * its side nav and every count on the site go through it, so a grid and the
 * number above it cannot disagree.
 */
export function productsIn(
  category: Category,
  allCategories: Category[],
  products: Product[],
): Product[] {
  const ids = idsUnder(category, allCategories);
  return products.filter((p) => ids.has(p.categoryId));
}

/**
 * Attaches the real product count to each category.
 *
 * `Category` used to carry a stored `itemCount`, typed by hand in `/admin`. It
 * drifted, as a hand-maintained copy of a derivable number always will: the
 * homepage row advertised "TOPS — 38 ITEMS" and the page it opened said "10
 * pieces". All seven stored counts were wrong, and the two groups read 0 while
 * their collection pages correctly showed 38 and 7.
 *
 * The field is gone rather than corrected, because correcting it would only
 * have reset the clock on the same drift. There is one number now and it is
 * counted from the catalogue every time it is rendered. §30.
 *
 * A group counts everything beneath it, so "Clothing" is the sum of its
 * children instead of the zero it used to show.
 */
export function withProductCounts(
  categories: Category[],
  products: Product[],
): CountedCategory[] {
  return categories.map((category) => ({
    ...category,
    count: productsIn(category, categories, products).length,
  }));
}
