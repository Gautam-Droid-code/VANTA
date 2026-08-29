import "server-only";

import { contentStore } from "./contentStore";
import type { Category, Product } from "@/data/types";

/**
 * Reads of the published catalogue, shared by the collection and product pages.
 *
 * Everything goes through the content store rather than importing `/data`, so
 * a product edited in `/admin` shows up here the same as on the homepage.
 */

export interface Collection {
  category: Category;
  products: Product[];
}

/**
 * The synthetic collections that are not categories.
 *
 * `/collections/new` and `/collections/sale` are views over the catalogue, not
 * groups a product belongs to — "on sale" is a fact about a price, and asking
 * an editor to tag it as well would be asking them to keep two things in sync.
 */
const VIEWS = {
  all: { select: (all: Product[]) => all },
  new: { select: (all: Product[]) => all.filter((p) => p.badge === "NEW") },
  sale: {
    select: (all: Product[]) =>
      all.filter((p) => p.compareAtPrice !== undefined && p.compareAtPrice > p.price),
  },
} as const;

type ViewSlug = keyof typeof VIEWS;

const isView = (slug: string): slug is ViewSlug => slug in VIEWS;

/** The categories a product can actually be in — a group holds none itself. */
export function leafCategories(all: Category[]): Category[] {
  const parentIds = new Set(all.flatMap((c) => (c.parentId ? [c.parentId] : [])));
  return all.filter((c) => !parentIds.has(c.id));
}

/** A group's own id plus its children's, for matching products. */
function idsUnder(category: Category, all: Category[]): Set<string> {
  return new Set([category.id, ...all.filter((c) => c.parentId === category.id).map((c) => c.id)]);
}

export async function getCollection(slug: string): Promise<Collection | null> {
  const { homepage, collectionPage, products } = await contentStore.read();

  if (isView(slug)) {
    return {
      // A view has no `Category` behind it, so one is synthesised. Its name
      // is editable content now rather than a string in this file.
      category: {
        id: slug,
        name: collectionPage.viewNames[slug],
        href: `/collections/${slug}`,
        itemCount: 0,
        image: { src: "", alt: "", width: 0, height: 0 },
      },
      products: VIEWS[slug].select(products),
    };
  }

  const category = homepage.categories.items.find((c) => c.id === slug);
  if (!category) return null;

  /**
   * A group shows everything in its children. `idsUnder` includes the group's
   * own id as well, so a product assigned directly to a group — which the
   * admin allows, even if it is unusual — is not silently invisible.
   */
  const ids = idsUnder(category, homepage.categories.items);
  return { category, products: products.filter((p) => ids.has(p.categoryId)) };
}

export async function getAllCollections(): Promise<Category[]> {
  const { homepage } = await contentStore.read();
  return homepage.categories.items;
}

export interface CollectionLink {
  slug: string;
  name: string;
  href: string;
  count: number;
  /** True for a group's children, so the rail can indent them. */
  nested?: boolean;
}

/**
 * Every collection a visitor can reach, for the listing page's side nav.
 *
 * Views and categories are deliberately in one list. To someone browsing,
 * "New Drops" and "Jackets" are the same kind of thing — a way into the
 * catalogue — and splitting them by how they happen to be computed would be
 * exposing an implementation detail as navigation.
 *
 * Counts are computed here rather than read from `Category.itemCount`, which
 * is a hand-typed field and drifts. A number sitting next to a grid the
 * visitor can count themselves has to be right.
 */
export async function getCollectionLinks(): Promise<CollectionLink[]> {
  const { homepage, collectionPage, products } = await contentStore.read();

  const view = (slug: ViewSlug): CollectionLink => ({
    slug,
    name: collectionPage.viewNames[slug],
    // "Everything" lives at /products, which is the canonical all-products
    // page; /collections/all redirects there. The other two views have no
    // route of their own and stay under /collections.
    href: slug === "all" ? "/products" : `/collections/${slug}`,
    count: VIEWS[slug].select(products).length,
  });

  const all = homepage.categories.items;
  const countFor = (c: Category) => {
    const ids = idsUnder(c, all);
    return products.filter((p) => ids.has(p.categoryId)).length;
  };

  /**
   * Groups first, each followed by its own children. Flat list with a `nested`
   * flag rather than a tree: the rail only ever draws one level, and a tree
   * would make every consumer handle a depth that cannot occur.
   */
  const grouped = all
    .filter((c) => !c.parentId)
    .flatMap((parent) => {
      const children = all.filter((c) => c.parentId === parent.id);
      const self = { slug: parent.id, name: parent.name, href: parent.href, count: countFor(parent) };
      // A category with no children is not a group; it stands alone.
      if (children.length === 0) return [self];
      return [
        self,
        ...children.map((c) => ({
          slug: c.id,
          name: c.name,
          href: c.href,
          count: countFor(c),
          nested: true,
        })),
      ];
    });

  return [view("new"), ...grouped, view("sale"), view("all")];
}

export async function getProduct(slug: string): Promise<Product | null> {
  const { products } = await contentStore.read();
  return products.find((p) => p.id === slug) ?? null;
}

/** Other products from the same category, for the "you might also like" rail. */
export async function getRelated(product: Product, limit = 4): Promise<Product[]> {
  const { products } = await contentStore.read();
  return products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, limit);
}

/** Every route these pages can serve, for `generateStaticParams`. */
export async function getAllProductIds(): Promise<string[]> {
  const { products } = await contentStore.read();
  return products.map((p) => p.id);
}

export async function getAllCollectionSlugs(): Promise<string[]> {
  const { homepage } = await contentStore.read();
  /**
   * "all" is excluded: /collections/all redirects to /products, and a
   * generated page at that path would be served instead of the redirect ever
   * firing. The view itself still exists — `getCollection("all")` answers, and
   * /products is what asks.
   */
  const viewSlugs = Object.keys(VIEWS).filter((slug) => slug !== "all");
  return [...viewSlugs, ...homepage.categories.items.map((c) => c.id)];
}
