import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/types";
import { backdropClass } from "@/lib/backdrops";
import { formatINR, cn } from "@/lib/format";
import { SaveButton } from "@/components/SaveButton";

interface ProductCardProps {
  product: Product;
  /** Sizes hint differs between the mobile rail and the desktop grid. */
  sizes?: string;
}

/**
 * Server component — nothing here needs JS. The hover zoom is a CSS transition,
 * and the scroll reveal comes from the `RevealItem` the rail wraps it in.
 *
 * `motion-safe` on the hover scale matters beyond accessibility: on touch
 * devices `:hover` can stick after a tap, leaving a card permanently zoomed.
 */
export function ProductCard({ product, sizes = "(min-width: 1024px) 25vw, 70vw" }: ProductCardProps) {
  return (
    <article className="h-full">
      <Link href={product.href} className="group flex h-full flex-col">
        <div
          className={cn(
            "relative aspect-[3/4] w-full overflow-hidden",
            backdropClass[product.backdrop],
          )}
        >
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            loading="lazy"
            sizes={sizes}
            className="object-cover object-center transition-transform duration-500 ease-in-out motion-safe:group-hover:scale-105"
          />

          <SaveButton productId={product.id} productName={product.name} overlay />

          {product.badge && (
            <span className="absolute left-0 top-0 bg-bone px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
              {product.badge}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-1 flex-col">
          <h3 className="text-sm font-medium text-bone">{product.name}</h3>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm text-bone">{formatINR(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-bone/40 line-through">
                {formatINR(product.compareAtPrice)}
              </span>
            )}
          </div>

          {product.codAvailable && (
            <span className="mt-2 self-start border border-bone/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-bone/50">
              COD Available
            </span>
          )}
        </div>
      </Link>
    </article>
  );
}
