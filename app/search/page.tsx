import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { contentStore } from "@/lib/contentStore";
import { searchCategories, searchProducts } from "@/lib/search";
import { leafCategories } from "@/lib/catalogue";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { ProductCard } from "@/components/ProductCard";

export const metadata: Metadata = pageMetadata({
  title: "Search",
  description:
    "Search the VANTA catalogue by piece, category or colour — shell jackets, parkas, cargo pants, tops and utility bags, all in one place.",
  path: "/search",
  noindex: true,
});

/**
 * Search results.
 *
 * A server component: the catalogue is already here, matching is a filter over
 * a few dozen products, and doing it on the server means results arrive in the
 * first response rather than after a round trip and a spinner.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const { homepage, products } = await contentStore.read();
  const categories = homepage.categories.items;

  const results = searchProducts(products, categories, query);
  // Only leaves: a group and its children would both match "jackets" and offer
  // two links to overlapping lists.
  const matchingCollections = searchCategories(leafCategories(categories), query);

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <div className="px-gutter pb-16 lg:px-gutter-lg lg:pb-24">
          <header className="border-b border-ink-line pb-6">
            <h1 className="headline text-display-sm lg:text-display-md">
              {query ? `“${query}”` : "Search"}
            </h1>
            {query ? (
              <p className="mt-3 text-sm text-bone/50">
                {results.length} {results.length === 1 ? "result" : "results"}
              </p>
            ) : (
              <p className="mt-3 max-w-prose text-base text-bone/60">
                Search for a piece, a category, or a material — try “parka”,
                “cargo” or “black”.
              </p>
            )}
          </header>

          {/* Collections first when one matches: someone searching "jackets"
              usually wants the collection, not one jacket from it. */}
          {matchingCollections.length > 0 && (
            <section className="mt-8">
              <h2 className="eyebrow">Collections</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {matchingCollections.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={c.href}
                      className="block rounded-full border border-ink-line px-4 py-2 text-label font-bold uppercase text-bone/70 transition-colors hover:border-bone/40 hover:text-bone"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {query && results.length === 0 ? (
            /* A dead end is the worst outcome of a search, so this one always
               offers somewhere to go next. */
            <div className="py-16">
              <p className="text-base text-bone/60">
                Nothing matched &ldquo;{query}&rdquo;.
              </p>
              <p className="mt-2 max-w-prose text-sm text-bone/40">
                Try a shorter phrase, or a different word — searching one word at
                a time usually finds more.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {leafCategories(categories).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={c.href}
                      className="block rounded-full border border-ink-line px-4 py-2 text-label font-bold uppercase text-bone/70 transition-colors hover:border-bone/40 hover:text-bone"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {results.length > 0 && (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {results.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
