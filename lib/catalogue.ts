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

  return { category, products: products.filter((p) => p.categoryId === category.id) };
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
    href: `/collections/${slug}`,
    count: VIEWS[slug].select(products).length,
  });

  return [
    view("new"),
    ...homepage.categories.items.map((c) => ({
      slug: c.id,
      name: c.name,
      href: c.href,
      count: products.filter((p) => p.categoryId === c.id).length,
    })),
    view("sale"),
    view("all"),
  ];
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
  return [...Object.keys(VIEWS), ...homepage.categories.items.map((c) => c.id)];
}
