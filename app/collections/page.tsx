import type { Metadata } from "next";
import { contentStore } from "@/lib/contentStore";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { CategoryList } from "@/components/CategoryList";

export async function generateMetadata(): Promise<Metadata> {
  const { collectionPage } = await contentStore.read();
  return { title: `${collectionPage.indexHeading} — VANTA`, description: collectionPage.indexIntro };
}

/**
 * The index the nav's "All categories" and "Collections" both point at.
 *
 * It reuses the homepage's own `CategoryList` rather than inventing a second
 * way of presenting the same rows — the hover-reveal behaviour and the data
 * shape are already right.
 */
export default async function CollectionsPage() {
  const { homepage, collectionPage } = await contentStore.read();

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

        <CategoryList heading="" items={homepage.categories.items} />
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
