import type { Metadata } from "next";
import { contentStore } from "@/lib/contentStore";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { CategoryList } from "@/components/CategoryList";

export const metadata: Metadata = {
  title: "Collections — VANTA",
  description: "Every VANTA collection.",
};

/**
 * The index the nav's "All categories" and "Collections" both point at.
 *
 * It reuses the homepage's own `CategoryList` rather than inventing a second
 * way of presenting the same rows — the hover-reveal behaviour and the data
 * shape are already right.
 */
export default async function CollectionsPage() {
  const { homepage } = await contentStore.read();

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <header className="px-gutter lg:px-gutter-lg">
          <h1 className="headline text-display-sm lg:text-display-md">Collections</h1>
          <p className="mt-3 max-w-prose text-base text-bone/60">
            Every range, built for the same conditions.
          </p>
        </header>

        <CategoryList heading="" items={homepage.categories.items} />
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
