import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contentStore } from "@/lib/contentStore";
import { getAllCollectionSlugs, getCollection } from "@/lib/catalogue";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { ProductCard } from "@/components/ProductCard";
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
  const [collection, { homepage }] = await Promise.all([
    getCollection(slug),
    contentStore.read(),
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

        {products.length === 0 ? (
          /* An empty collection is a dead end, so it points somewhere. */
          <div className="px-gutter py-24 text-center lg:px-gutter-lg">
            <p className="text-base text-bone/60">Nothing in this collection yet.</p>
            <Link
              href="/collections/all"
              className="mt-4 inline-block text-label font-bold uppercase text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              Browse everything
            </Link>
          </div>
        ) : (
          <RevealGroup className="grid grid-cols-2 gap-x-4 gap-y-10 px-gutter py-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:px-gutter-lg lg:py-14">
            {products.map((product) => (
              <RevealItem key={product.id}>
                <ProductCard
                  product={product}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
