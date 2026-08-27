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
const VIEWS: Record<string, { name: string; select: (all: Product[]) => Product[] }> = {
  all: { name: "Everything", select: (all) => all },
  new: { name: "New Drops", select: (all) => all.filter((p) => p.badge === "NEW") },
  sale: {
    name: "Sale",
    select: (all) => all.filter((p) => p.compareAtPrice !== undefined && p.compareAtPrice > p.price),
  },
};

export async function getCollection(slug: string): Promise<Collection | null> {
  const { homepage, products } = await contentStore.read();

  const view = VIEWS[slug];
  if (view) {
    return {
      category: {
        id: slug,
        name: view.name,
        href: `/collections/${slug}`,
        itemCount: 0,
        image: { src: "", alt: "", width: 0, height: 0 },
      },
      products: view.select(products),
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
