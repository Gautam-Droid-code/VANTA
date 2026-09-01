import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { contentStore } from "@/lib/contentStore";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { WishlistContents } from "@/components/WishlistContents";

export const metadata: Metadata = pageMetadata({
  title: "Wishlist",
  description:
    "Pieces you have saved for later. Kept in this browser, and synced to your account when you are signed in so they follow you between devices.",
  path: "/wishlist",
  noindex: true,
});

/**
 * The wishlist. Same arrangement as the bag: a server component that reads the
 * published catalogue, and a client child that resolves the browser's saved
 * ids against it.
 */
export default async function WishlistPage() {
  const { homepage, products } = await contentStore.read();

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <div className="px-gutter pb-16 lg:px-gutter-lg lg:pb-24">
          <h1 className="headline text-display-sm lg:text-display-md">Wishlist</h1>
          <div className="mt-8">
            <WishlistContents catalogue={products} />
          </div>
        </div>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
