import Link from "next/link";
import type { CollectionLink } from "@/lib/catalogue";
import { cn } from "@/lib/format";

/**
 * The way between collections, from inside one.
 *
 * Server component — it is a list of links and an active state, and nothing
 * about that needs JS.
 *
 * Two layouts, one list. On desktop it is a rail down the left edge, which is
 * where a filter belongs and where it can stay visible while the grid scrolls.
 * Below `lg` that column would eat half the screen, so the same links become a
 * horizontally scrolling row above the grid — still one tap away, still showing
 * where you are, without stealing width from the products.
 */
export function CollectionNav({
  links,
  activeSlug,
}: {
  links: CollectionLink[];
  activeSlug: string;
}) {
  return (
    <nav aria-label="Collections">
      <p className="eyebrow hidden lg:block">Categories</p>

      {/* Desktop rail */}
      <ul className="mt-4 hidden lg:block lg:space-y-1">
        {links.map((link) => {
          const active = link.slug === activeSlug;
          return (
            <li key={link.slug}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-baseline justify-between gap-3 py-1.5 text-sm transition-colors duration-200",
                  active ? "font-medium text-bone" : "text-bone/50 hover:text-bone",
                )}
              >
                <span>{link.name}</span>
                <span className="text-xs tabular-nums text-bone/30">{link.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Mobile row — same links, scrolled sideways rather than stacked. */}
      <ul className="-mx-gutter flex gap-2 overflow-x-auto px-gutter pb-1 lg:hidden [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {links.map((link) => {
          const active = link.slug === activeSlug;
          return (
            <li key={link.slug} className="flex-none">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-full border px-3 py-1.5 text-label font-bold uppercase transition-colors duration-200",
                  active
                    ? "border-bone bg-bone text-ink"
                    : "border-ink-line text-bone/60 hover:border-bone/40 hover:text-bone",
                )}
              >
                {link.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
