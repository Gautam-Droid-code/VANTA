import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contentStore } from "@/lib/contentStore";
import { getAllProductIds, getProduct, getRelated } from "@/lib/catalogue";
import { backdropClass } from "@/lib/backdrops";
import { formatINR } from "@/lib/format";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { ProductCard } from "@/components/ProductCard";
import { AddToBagButton } from "@/components/AddToBagButton";
import { trustIcons } from "@/components/ui/Icons";

export async function generateStaticParams() {
  return (await getAllProductIds()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Not found" };
  return { title: `${product.name} — VANTA`, description: product.image.alt };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [{ homepage }, related] = await Promise.all([
    contentStore.read(),
    getRelated(product),
  ]);

  const category = homepage.categories.items.find((c) => c.id === product.categoryId);
  const onSale = product.compareAtPrice !== undefined && product.compareAtPrice > product.price;
  const savedPct = onSale
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:px-gutter-lg xl:gap-16">
          <div className={`relative aspect-[3/4] w-full overflow-hidden ${backdropClass[product.backdrop]}`}>
            <Image
              src={product.image.src}
              alt={product.image.alt}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center"
            />
            {product.badge && (
              <span className="absolute left-0 top-0 bg-bone px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                {product.badge}
              </span>
            )}
          </div>

          <div className="px-gutter py-8 lg:px-0 lg:py-0 lg:self-center">
            <nav aria-label="Breadcrumb" className="eyebrow">
              <Link href="/" className="transition-colors hover:text-bone">
                Home
              </Link>
              <span aria-hidden className="px-2">/</span>
              {category ? (
                <>
                  <Link href={category.href} className="transition-colors hover:text-bone">
                    {category.name}
                  </Link>
                  <span aria-hidden className="px-2">/</span>
                </>
              ) : null}
              <span className="text-bone/80">{product.name}</span>
            </nav>

            <h1 className="headline mt-4 text-display-sm lg:text-[3rem] lg:leading-[0.9]">
              {product.name}
            </h1>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl text-bone">{formatINR(product.price)}</span>
              {onSale && (
                <>
                  <span className="text-base text-bone/40 line-through">
                    {formatINR(product.compareAtPrice!)}
                  </span>
                  <span className="bg-flare-red px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-bone">
                    {savedPct}% off
                  </span>
                </>
              )}
            </div>

            <p className="mt-6 max-w-prose whitespace-pre-line text-base leading-relaxed text-bone/70">
              {product.image.alt}
            </p>

            <div className="mt-8">
              <AddToBagButton productId={product.id} />
            </div>

            {/* The buying facts, in the same spec-sheet register as the rest
                of the site. Only the ones this product actually carries. */}
            <dl className="mt-8 divide-y divide-ink-line border-y border-ink-line">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="eyebrow">Cash on delivery</dt>
                <dd className="text-sm text-bone/80">
                  {product.codAvailable ? "Available" : "Not available"}
                </dd>
              </div>
              {category && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="eyebrow">Category</dt>
                  <dd className="text-sm text-bone/80">
                    <Link href={category.href} className="underline underline-offset-4 hover:text-bone">
                      {category.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="eyebrow">Reference</dt>
                <dd className="text-sm uppercase tracking-[0.1em] text-bone/80">{product.id}</dd>
              </div>
            </dl>

            <ul className="mt-6 space-y-3">
              {homepage.trust.items.slice(0, 3).map((item) => {
                const Icon = trustIcons[item.icon];
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-bone/50" />
                    <span className="text-sm text-bone/60">
                      <span className="text-bone/80">{item.title}</span> — {item.detail}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {related.length > 0 && (
          <section className="px-gutter py-16 lg:px-gutter-lg lg:py-24">
            <h2 className="headline text-display-sm">More in {category?.name ?? "this range"}</h2>
            {/* Plain, for the same reason as the collection grid: products
                must not depend on hydration to be visible. */}
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
