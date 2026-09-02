import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contentStore } from "@/lib/contentStore";
import { getAllCollectionSlugs, getCollection, getCollectionLinks } from "@/lib/catalogue";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { ProductCard } from "@/components/ProductCard";
import { CollectionNav } from "@/components/CollectionNav";

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

  const { name } = collection.category;
  const count = collection.products.length;

  return pageMetadata({
    title: name,
    /**
     * The editor's own words when there are any. The fallback is a real
     * sentence rather than "12 pieces in Jackets" — a description that reads
     * like a database row tells a searcher nothing and looks machine-made in a
     * result list.
     *
     * The closing clause is "7-day returns", not "seven-day returns", and that
     * is not a style preference. The sentence length varies with the category
     * name and its count; measured across all nine collections, the numeral
     * lands every one of them in 152–159 characters, while spelling the word
     * out pushes the two longest past 160 and into a truncated result.
     */
    description:
      collection.category.description ||
      `${count} ${count === 1 ? "piece" : "pieces"} in VANTA's ${name} range — technical streetwear built for the Indian street. Cash on delivery pan-India, free shipping over ₹1,999, 7-day returns.`,
    path: `/collections/${slug}`,
  });
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [collection, { homepage, collectionPage }, links] = await Promise.all([
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
          {/* Where you are, in the site's own spec-sheet voice. "Collections"
              sits between Home and the category because that page genuinely
              exists and is genuinely the parent — a trail that skips a real
              level is a trail that lies about the site's shape. */}
          <Breadcrumbs
            trail={[
              { name: "Home", href: "/" },
              { name: "Collections", href: "/collections" },
              { name: category.name },
            ]}
          />

          {/* Optional wide image. Absent for most collections, and the plain
              heading below is the complete design when it is. */}
          {category.banner ? (
            <div className="relative mt-4 aspect-[21/9] w-full overflow-hidden lg:aspect-[3/1]">
              <Image
                src={category.banner.src}
                alt={category.banner.alt}
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-ink-line pb-6">
            <h1 className="headline text-display-sm lg:text-display-md">{category.name}</h1>
            {collectionPage.showCount ? (
              <p className="text-sm text-bone/50">
                {products.length} {products.length === 1 ? "piece" : "pieces"}
              </p>
            ) : null}
          </div>

          {category.description ? (
            <p className="mt-6 max-w-prose whitespace-pre-line text-base leading-relaxed text-bone/60">
              {category.description}
            </p>
          ) : null}
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
                <p className="text-base text-bone/60">{collectionPage.emptyMessage}</p>
                <Link
                  href="/products"
                  className="mt-4 inline-block text-label font-bold uppercase text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  {collectionPage.emptyCtaLabel}
                </Link>
              </div>
            ) : (
              /*
                No scroll reveal on the product grid.
                Two reasons, and the second is the important one. A reveal
                trigger asks for a percentage of the element, and this grid is
                as tall as the collection is long — at twelve products it is
                ~1970px, of which only ~430px is ever on screen, so the 25%
                threshold was never met and the whole catalogue stayed at
                opacity 0 until the reader scrolled.

                Tuning the threshold would have fixed that case and left the
                real problem: Framer writes `opacity: 0` into the server HTML,
                so anything that stops hydration finishing — slow network,
                a JS error, an old browser — leaves a listing page with no
                products on it. That is the one thing this page exists to show.
                It renders plainly and is always visible.
              */
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    sizes="(min-width: 1024px) 28vw, (min-width: 640px) 33vw, 50vw"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
