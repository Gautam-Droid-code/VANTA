import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contentStore } from "@/lib/contentStore";
import { getAllCollectionSlugs, getCollection, getCollectionLinks } from "@/lib/catalogue";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { ProductCard } from "@/components/ProductCard";
import { CollectionNav } from "@/components/CollectionNav";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";

/**
 * A collection listing.
 *
 * Deliberately quiet compared with the homepage: no pinned scenes, no camera
 * moves. This is the page where someone is comparing garments and reading
 * prices, and the cinematic layer would be working against that.
 */
export async function generateStaticParams() {
  return (await getAllCollectionSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return { title: "Not found" };
  return {
    title: `${collection.category.name} — VANTA`,
    description: `${collection.products.length} pieces in ${collection.category.name}.`,
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [collection, { homepage }, links] = await Promise.all([
    getCollection(slug),
    contentStore.read(),
    getCollectionLinks(),
  ]);

  if (!collection) notFound();

  const { category, products } = collection;

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <header className="px-gutter lg:px-gutter-lg">
          {/* Where you are, in the site's own spec-sheet voice. */}
          <nav aria-label="Breadcrumb" className="eyebrow">
            <Link href="/" className="transition-colors hover:text-bone">
              Home
            </Link>
            <span aria-hidden className="px-2">
              /
            </span>
            <span className="text-bone/80">{category.name}</span>
          </nav>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-ink-line pb-6">
            <h1 className="headline text-display-sm lg:text-display-md">{category.name}</h1>
            <p className="text-sm text-bone/50">
              {products.length} {products.length === 1 ? "piece" : "pieces"}
            </p>
          </div>
        </header>

        {/*
          Rail plus grid. `items-start` so the rail stays at the top of the
          column rather than centring itself against a tall grid, and `min-w-0`
          on the grid side so a wide card can never push the rail off-screen.
        */}
        <div className="px-gutter py-8 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-gutter-lg lg:py-12 xl:grid-cols-[13rem_minmax(0,1fr)]">
          <CollectionNav links={links} activeSlug={slug} />

          <div className="mt-8 min-w-0 lg:mt-0">
            {products.length === 0 ? (
              /* An empty collection is a dead end, so it points somewhere. */
              <div className="py-20 text-center">
                <p className="text-base text-bone/60">Nothing in this collection yet.</p>
                <Link
                  href="/collections/all"
                  className="mt-4 inline-block text-label font-bold uppercase text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Browse everything
                </Link>
              </div>
            ) : (
              <RevealGroup className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-6">
                {products.map((product) => (
                  <RevealItem key={product.id}>
                    <ProductCard
                      product={product}
                      sizes="(min-width: 1024px) 28vw, (min-width: 640px) 33vw, 50vw"
                    />
                  </RevealItem>
                ))}
              </RevealGroup>
            )}
          </div>
        </div>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
