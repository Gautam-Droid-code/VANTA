import Link from "next/link";
import type { Metadata } from "next";
import { contentStore } from "@/lib/contentStore";
import { leafCategories, withProductCounts } from "@/lib/catalogue";
import { pageMetadata } from "@/lib/seo";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { NotFoundSearch } from "@/components/NotFoundSearch";

/**
 * The 404.
 *
 * Next's default was shipping until now — an unstyled white page with black
 * Helvetica, which on a site that is otherwise bone-on-ink reads as "this
 * site is broken" rather than "that page doesn't exist".
 *
 * Built to be genuinely useful rather than a joke with a dead end. Someone
 * arrives here from a stale link, a typo, or a product that was removed, and
 * the three things that help are: a search box, the categories with their real
 * counts, and a route back into the catalogue. All three are here and all three
 * are real links, not decoration.
 *
 * This returns a real **HTTP 404** — Next sets the status for `not-found.tsx`
 * automatically when reached via `notFound()` or an unmatched route. Verified
 * with `curl -o /dev/null -w '%{http_code}'`, not assumed, because a
 * soft-404 (a "not found" page served with 200) is worse than no 404 page:
 * it gets indexed.
 */
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Page not found",
    description:
      "That page doesn't exist. Search the VANTA catalogue, or browse jackets, parkas, tops, pants and bags — technical streetwear built for the Indian street.",
    path: "/404",
  }),
  /**
   * No canonical and no indexing. `pageMetadata` would give this a canonical of
   * `/404`, which would be an instruction to index an error page under a URL
   * that is never actually requested. Overridden rather than special-cased in
   * the helper: this is the only route with the problem.
   */
  alternates: {},
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  /**
   * The content store still works here, so the page can offer real categories
   * with real counts rather than a hardcoded list that would rot. A 404 that
   * lists a category which no longer exists is a second dead end.
   */
  const { homepage, products } = await contentStore.read();
  const categories = withProductCounts(leafCategories(homepage.categories.items), products);

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <div className="mx-auto max-w-3xl px-gutter pb-24 lg:px-gutter-lg">
          {/* The register the rest of the site uses for meta: a small
              monospaced code above the headline, like a spec sheet. */}
          <p className="eyebrow tabular-nums">Error 404</p>

          <h1 className="headline mt-3 text-display-sm lg:text-display-md">
            This page doesn&rsquo;t exist.
          </h1>

          <p className="mt-4 max-w-prose text-base leading-relaxed text-bone-dim">
            The link may be old, or the piece may have sold out and been taken
            down. Everything below still works.
          </p>

          <NotFoundSearch className="mt-8" />

          <nav aria-labelledby="not-found-categories" className="mt-12">
            <h2 id="not-found-categories" className="eyebrow">
              Browse by category
            </h2>
            <ul className="mt-4 divide-y divide-ink-line border-y border-ink-line">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/collections/${category.id}`}
                    className="flex items-baseline justify-between gap-4 py-3 transition-opacity hover:opacity-70"
                  >
                    <span className="text-sm text-bone">{category.name}</span>
                    <span className="text-label font-bold uppercase tabular-nums text-bone-faint">
                      {category.count} {category.count === 1 ? "piece" : "pieces"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            <Link
              href="/products"
              className="text-label font-bold uppercase text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              All {products.length} pieces
            </Link>
            <Link
              href="/collections"
              className="text-label font-bold uppercase text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              Collections
            </Link>
            <Link
              href="/"
              className="text-label font-bold uppercase text-bone-faint underline underline-offset-4 transition-colors hover:text-bone"
            >
              Home
            </Link>
          </div>
        </div>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
