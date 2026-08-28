import type { Category, Product } from "@/data/types";

/**
 * Product search.
 *
 * Deliberately simple, because the catalogue is tens of products rather than
 * tens of thousands: no index, no ranking library, no fuzzy matching. Anything
 * more would be machinery in place of an answer.
 *
 * What it searches is the point. A shopper types "jacket" or "black" or
 * "cargo", and only the first of those is in a product's name — the rest live
 * in its category and its alt text, which describes the garment. Searching the
 * name alone would return nothing for most of what people actually type.
 */

/** Everything about a product worth matching against, lowercased once. */
function haystack(product: Product, categoryName: string | undefined): string {
  return [
    product.name,
    categoryName ?? "",
    product.image.alt,
    product.badge ?? "",
    // "cod" finds the products that offer it — a real question shoppers have.
    product.codAvailable ? "cash on delivery cod" : "",
  ]
    .join(" ")
    .toLowerCase();
}

/** Splits on whitespace and drops punctuation, so "men's" matches "mens". */
export function tokenise(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export interface SearchResult {
  product: Product;
  /** Higher is better. Only used to order, never shown. */
  score: number;
}

export function searchProducts(
  products: Product[],
  categories: Category[],
  query: string,
): Product[] {
  const tokens = tokenise(query);
  if (tokens.length === 0) return [];

  const categoryName = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));

  const results: SearchResult[] = [];

  for (const product of products) {
    const text = haystack(product, categoryName.get(product.categoryId));
    const name = product.name.toLowerCase();

    /**
     * Every token has to match something. "black jacket" should not return
     * every jacket — someone who typed two words meant both of them.
     */
    if (!tokens.every((t) => text.includes(t))) continue;

    /**
     * Ranking, in the order a shopper would expect:
     * a name that starts with what they typed, then a name that contains it,
     * then anything that matched only on category or description.
     */
    let score = 0;
    for (const token of tokens) {
      if (name.startsWith(token)) score += 4;
      else if (name.includes(token)) score += 2;
      else score += 1;
    }
    // The whole query appearing intact beats the same words scattered.
    if (name.includes(query.trim().toLowerCase())) score += 3;

    results.push({ product, score });
  }

  return results
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .map((r) => r.product);
}

/**
 * Collections whose name matches, so a search for "jackets" offers the
 * collection as well as the twelve products inside it.
 */
export function searchCategories(categories: Category[], query: string): Category[] {
  const tokens = tokenise(query);
  if (tokens.length === 0) return [];
  return categories.filter((c) => {
    const name = c.name.toLowerCase();
    return tokens.every((t) => name.includes(t));
  });
}
