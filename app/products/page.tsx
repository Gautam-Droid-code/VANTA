import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { contentStore } from "@/lib/contentStore";
import { getCollectionLinks } from "@/lib/catalogue";
import { parseSort, sortProducts } from "@/lib/productSort";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { ProductCard } from "@/components/ProductCard";
import { CollectionNav } from "@/components/CollectionNav";
import { SortSelect } from "@/components/SortSelect";

/**
 * Every product.
 *
 * This is the canonical "everything" page. `/collections/all` used to be, and
 * now redirects here — two URLs listing the same 45 products is duplicate
 * content, and `/products` is the one people actually try, because every
 * product link is `/products/<slug>` and trimming a URL is a habit.
 *
 * What it has that a collection page does not is sorting. That is the reason
 * it earns its own route rather than being a second name for a view.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { collectionPage, products } = await contentStore.read();
  return pageMetadata({
    title: collectionPage.viewNames.all,
    /**
     * Counted from the catalogue rather than written as a number in a string,
     * for the same reason category counts are derived (§30): a hand-typed
     * figure in a meta description is a hand-typed figure that goes stale.
     */
    description: `Every piece VANTA makes — ${products.length} in total, from shell jackets and parkas to cargo pants, tops and utility bags. COD pan-India, free shipping over ₹1,999.`,
    /**
     * The sorted variants are the same products in a different order. Without
     * this, `?sort=price-asc` and `?sort=name` compete with each other in a
     * search index for no benefit. `pageMetadata` strips the query itself, so
     * this cannot be got wrong by passing the live URL.
     */
    path: "/products",
  });
}

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const [{ homepage, products, collectionPage }, links, params] = await Promise.all([
    contentStore.read(),
    getCollectionLinks(),
    searchParams,
  ]);

  const sort = parseSort(params.sort);
  const sorted = sortProducts(products, sort);

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <header className="px-gutter lg:px-gutter-lg">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-line pb-6">
            <div>
              <h1 className="headline text-display-sm lg:text-display-md">
                {collectionPage.viewNames.all}
              </h1>
              {collectionPage.showCount && (
                <p className="mt-2 text-sm text-bone/50">
                  {sorted.length} {sorted.length === 1 ? "piece" : "pieces"}
                </p>
              )}
            </div>

            {/*
              `useSearchParams` inside SortSelect opts its subtree into
              client-side rendering, and Next requires a Suspense boundary for
              that. The fallback is the same height as the control so the
              heading row does not jump as it resolves.
            */}
            <Suspense fallback={<div className="h-9" />}>
              <SortSelect value={sort} />
            </Suspense>
          </div>
        </header>

        <div className="px-gutter py-8 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-gutter-lg lg:py-12 xl:grid-cols-[13rem_minmax(0,1fr)]">
          <CollectionNav links={links} activeSlug="all" />

          <div className="mt-8 min-w-0 lg:mt-0">
            {/*
              No scroll reveal, for the same reason as the collection grids:
              Framer writes `opacity: 0` into the server HTML, so anything that
              stops hydration leaves a listing page with no products on it.
            */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-6">
              {sorted.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  sizes="(min-width: 1024px) 28vw, (min-width: 640px) 33vw, 50vw"
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
