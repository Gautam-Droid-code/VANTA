"use client";

import Link from "next/link";
import { useDraft } from "./AdminDraftProvider";
import { STALE_BADGE_DAYS, findStaleBadges } from "@/lib/staleBadges";

/**
 * Points out NEW badges that have been sitting for a while.
 *
 * "New Drops" is computed from the badge, so nothing ever leaves it on its own.
 * This is the only thing that would tell an editor a product has been
 * advertised as new since January.
 *
 * It reports and does not act. A drop might genuinely run for a season, and a
 * site that silently un-badged someone's products would be making a
 * merchandising decision it has no standing to make. Renders nothing when
 * there is nothing to say — a permanent panel reading "0 stale badges" is
 * furniture, and furniture stops being read.
 */
export function StaleBadgeNotice() {
  const { products } = useDraft();
  const stale = findStaleBadges(products);

  if (stale.length === 0) return null;

  return (
    <section className="rounded-xl border border-admin-accent/25 bg-admin-accent-soft p-5">
      <h2 className="font-admin-display text-sm font-semibold text-admin-ink">
        {stale.length === 1
          ? "1 product has been marked NEW for a while"
          : `${stale.length} products have been marked NEW for a while`}
      </h2>
      <p className="mt-1 text-sm text-admin-muted">
        Anything badged NEW shows in New Drops until the badge is cleared.
        These have carried it for over {STALE_BADGE_DAYS} days.
      </p>

      <ul className="mt-4 space-y-2">
        {stale.slice(0, 5).map(({ product, days }) => (
          <li key={product.id} className="flex flex-wrap items-baseline gap-x-3 text-sm">
            <span className="font-medium text-admin-ink">{product.name}</span>
            <span className="text-xs text-admin-muted">
              {days} day{days === 1 ? "" : "s"}
            </span>
          </li>
        ))}
        {stale.length > 5 && (
          <li className="text-xs text-admin-muted">and {stale.length - 5} more</li>
        )}
      </ul>

      <Link
        href="/admin/products"
        className="mt-4 inline-block text-label font-bold uppercase text-admin-accent underline underline-offset-4 transition-opacity hover:opacity-70"
      >
        Review products
      </Link>
    </section>
  );
}
