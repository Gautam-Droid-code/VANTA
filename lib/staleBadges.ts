import type { Product } from "@/data/types";

/**
 * Badges that go stale, and noticing when they have.
 *
 * "New Drops" is computed from the NEW badge, so nothing ever leaves it on its
 * own: a product badged in January is still being advertised as new in June
 * unless somebody remembers to clear it. The site cannot decide that for an
 * editor — a drop might genuinely run for a season — so this does not expire
 * anything. It points, and the editor decides.
 *
 * Client-safe: no `server-only`, no database. The admin's product table and its
 * overview both use it, and both are client components.
 */

/**
 * How long a badge may sit before it is worth mentioning.
 *
 * A constant rather than a setting, because a Settings page does not exist yet
 * and inventing one for a single number would be disproportionate. It is the
 * obvious first entry when that page is built.
 */
export const STALE_BADGE_DAYS = 30;

/** Only badges that make a time claim. "LOW STOCK" is about inventory. */
const TIME_SENSITIVE = new Set(["NEW"]);

export function isTimeSensitiveBadge(badge: string | undefined): boolean {
  return Boolean(badge && TIME_SENSITIVE.has(badge.trim().toUpperCase()));
}

/**
 * Days since the badge was applied, or null when it cannot be known.
 *
 * Null for a product with no badge, a badge that makes no time claim, or one
 * badged before `badgeSetAt` existed. Null is deliberately not zero: "we don't
 * know" and "applied today" are different answers, and treating the first as
 * the second would silently exempt every older product forever.
 */
export function badgeAgeInDays(product: Product, now: Date = new Date()): number | null {
  if (!isTimeSensitiveBadge(product.badge)) return null;
  if (!product.badgeSetAt) return null;

  const set = new Date(product.badgeSetAt);
  if (Number.isNaN(set.getTime())) return null;

  const ms = now.getTime() - set.getTime();
  // A clock skew or a future date reads as 0 rather than a negative age.
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export interface StaleBadge {
  product: Product;
  days: number;
}

/** Products whose time-sensitive badge is older than the threshold, oldest first. */
export function findStaleBadges(
  products: Product[],
  thresholdDays: number = STALE_BADGE_DAYS,
  now: Date = new Date(),
): StaleBadge[] {
  return products
    .flatMap((product) => {
      const days = badgeAgeInDays(product, now);
      return days !== null && days >= thresholdDays ? [{ product, days }] : [];
    })
    .sort((a, b) => b.days - a.days);
}

/**
 * Stamps `badgeSetAt` on products whose badge has just changed.
 *
 * Run at publish, against the currently published catalogue, so the date is a
 * fact the server observed rather than something an editor had to remember.
 * Doing it in the form would mean a date that is wrong whenever anyone edits a
 * product through any other path.
 *
 * Dates every badge, not only the ones that go stale. "LOW STOCK" gets a date
 * it nothing currently reads, which costs one string and means the history is
 * already there if that badge ever becomes time-sensitive. Deciding *which*
 * badges are worth reporting is `isTimeSensitiveBadge`'s job, and keeping the
 * two separate is what lets that list change without a data migration.
 *
 * The rules:
 * - Badge unchanged → the existing date is kept. Re-publishing an unrelated
 *   edit must not reset the clock, or nothing would ever look stale.
 * - Badge changed, or newly added → stamped now.
 * - Badge removed → the date goes with it, so re-badging later starts fresh.
 */
export function stampBadgeDates(
  incoming: Product[],
  published: Product[],
  now: Date = new Date(),
): Product[] {
  const before = new Map(published.map((p) => [p.id, p]));

  return incoming.map((product) => {
    if (!product.badge) {
      // Nothing to date. Strip rather than keep, matching how the schema treats
      // an absent optional field everywhere else.
      if (!product.badgeSetAt) return product;
      const rest = { ...product };
      delete rest.badgeSetAt;
      return rest;
    }

    const previous = before.get(product.id);
    const unchanged = previous?.badge === product.badge && Boolean(previous?.badgeSetAt);

    return unchanged
      ? { ...product, badgeSetAt: previous!.badgeSetAt }
      : { ...product, badgeSetAt: now.toISOString() };
  });
}
