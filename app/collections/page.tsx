import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { contentStore } from "@/lib/contentStore";
import { leafCategories, withProductCounts } from "@/lib/catalogue";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { CategoryList } from "@/components/CategoryList";

export async function generateMetadata(): Promise<Metadata> {
  const { collectionPage, homepage, products } = await contentStore.read();
  const names = leafCategories(homepage.categories.items).map((c) => c.name);
  return pageMetadata({
    title: collectionPage.indexHeading,
    /**
     * The editor's own intro wins when there is one. The fallback names the
     * actual categories rather than saying "browse our collections", because
     * the category names are the words somebody would have searched for.
     */
    /**
     * The editor's intro *plus* the category names, not one or the other.
     * Measured: the intro alone rendered a 43-character description, which
     * wastes most of the line a search result gives you. The category names
     * are the words somebody would have typed, so they earn the space.
     */
    description: [
      collectionPage.indexIntro,
      `Browse ${names.join(", ")} — ${products.length} pieces built for the Indian street, with cash on delivery pan-India.`,
    ]
      .filter(Boolean)
      .join(" "),
    path: "/collections",
  });
}

/**
 * The index the nav's "All categories" and "Collections" both point at.
 *
 * It reuses the homepage's own `CategoryList` rather than inventing a second
 * way of presenting the same rows — the hover-reveal behaviour and the data
 * shape are already right.
 */
export default async function CollectionsPage() {
  const { homepage, collectionPage, products } = await contentStore.read();

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <header className="px-gutter lg:px-gutter-lg">
          <h1 className="headline text-display-sm lg:text-display-md">
            {collectionPage.indexHeading}
          </h1>
          {collectionPage.indexIntro ? (
            <p className="mt-3 max-w-prose whitespace-pre-line text-base text-bone/60">
              {collectionPage.indexIntro}
            </p>
          ) : null}
        </header>

        <CategoryList
          heading=""
          items={leafCategories(withProductCounts(homepage.categories.items, products))}
        />
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
