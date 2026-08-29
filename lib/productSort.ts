import type { Product } from "@/data/types";

/**
 * Sorting for the all-products page.
 *
 * Pure and separate from the page so the ordering rules can be tested without
 * a server, and so a collection page can adopt the same control later without
 * the logic being lifted out of a component first.
 */

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A–Z" },
  { value: "discount", label: "Biggest saving" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: SortValue = "featured";

/**
 * A query string is user input, so anything unrecognised falls back rather
 * than throwing. `?sort=nonsense` should show the page, not a 500.
 */
export function parseSort(value: string | undefined): SortValue {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as SortValue)
    : DEFAULT_SORT;
}

/** What a product is actually reduced by, in rupees. Zero when not on sale. */
function saving(product: Product): number {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) return 0;
  return product.compareAtPrice - product.price;
}

/**
 * Sorts a copy, never the array it was given.
 *
 * The input is the catalogue read from the content store, and sorting in place
 * would reorder it for everything else rendered in the same request — the
 * product rail on the same page would silently change order.
 *
 * Every comparison falls back to name. Without it, products sharing a price
 * come back in whatever order the last sort left them, so the same URL can
 * render two different grids and the page looks unstable on reload.
 */
export function sortProducts(products: Product[], sort: SortValue): Product[] {
  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);

  switch (sort) {
    case "price-asc":
      return [...products].sort((a, b) => a.price - b.price || byName(a, b));
    case "price-desc":
      return [...products].sort((a, b) => b.price - a.price || byName(a, b));
    case "name":
      return [...products].sort(byName);
    case "discount":
      return [...products].sort((a, b) => saving(b) - saving(a) || byName(a, b));
    case "featured":
    default:
      /**
       * Catalogue order, untouched.
       *
       * "Featured" means whatever the shop decided in `/admin`, so this is the
       * one option that must not reorder anything — imposing a secondary sort
       * here would quietly overrule the editor's arrangement.
       */
      return [...products];
  }
}
