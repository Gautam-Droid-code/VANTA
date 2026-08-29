import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { contentStore } from "@/lib/contentStore";
import { rupeesToPaise } from "@/lib/money";
import type { Product } from "@/data/types";

/**
 * Orders: pricing, numbering, and the guest access link.
 *
 * The rule that shapes this file: **the browser never sends a price.** It sends
 * product ids and quantities. Everything monetary is computed here, from the
 * catalogue the storefront itself renders from. A checkout that trusts a total
 * from a form has handed the customer a discount field.
 */

export interface PricedLine {
  productId: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  /** Paise. */
  unitPrice: number;
  quantity: number;
  /** Paise. */
  lineTotal: number;
}

export interface PricedBag {
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  /** Ids that no longer resolve, so the page can say so instead of silently
   *  charging for fewer things than the customer thought they were buying. */
  unavailable: string[];
}

/**
 * Prices a bag against the live catalogue.
 *
 * Used twice, deliberately: once to render the checkout summary, and again
 * inside `createOrder` immediately before writing. They are separate reads
 * because a price can change between someone opening checkout and pressing the
 * button, and the second read is the one that decides. Rendering a total and
 * then trusting it would mean a stale tab could place an order at yesterday's
 * price.
 */
export async function priceBag(
  requested: Array<{ productId: string; quantity: number }>,
): Promise<PricedBag> {
  const { products } = await contentStore.read();
  const byId = new Map<string, Product>(products.map((p) => [p.id, p]));

  const lines: PricedLine[] = [];
  const unavailable: string[] = [];

  for (const item of requested) {
    const product = byId.get(item.productId);
    if (!product) {
      unavailable.push(item.productId);
      continue;
    }

    const unitPrice = rupeesToPaise(product.price);
    lines.push({
      productId: product.id,
      // Snapshot fields, read here and copied into the order unchanged.
      title: product.name,
      imageSrc: product.image.src,
      imageAlt: product.image.alt,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  /**
   * Shipping and discount are zero and computed nowhere.
   *
   * The trust strip promises free delivery over ₹1,999, but there is no
   * shipping engine, no rate table and no pincode serviceability check — so
   * charging anything here would be inventing a number. Zero is the honest
   * placeholder, and the order stores the columns so adding a real rule later
   * changes a calculation rather than a schema.
   */
  const shipping = 0;
  const discount = 0;

  return { lines, subtotal, shipping, discount, total: subtotal + shipping - discount, unavailable };
}

/**
 * Generates the next human-readable order number, `VNT-YYYY-NNNNN`.
 *
 * Counts this year's orders and adds one. That is racy under concurrent
 * checkouts — two orders can compute the same number — which is exactly why
 * `orderNumber` carries a unique index and `createOrder` retries. The
 * alternative, a Postgres sequence, means a migration and a second source of
 * truth for something that is a display string; at this volume a retry loop is
 * cheaper and the failure mode is a unique violation rather than a duplicate.
 */
async function nextOrderNumber(year: number): Promise<string> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const count = await prisma.order.count({
    where: { placedAt: { gte: start, lt: end } },
  });

  return `VNT-${year}-${String(count + 1).padStart(5, "0")}`;
}

/** Exposed for the retry in `createOrder`, and for tests. */
export async function generateOrderNumber(): Promise<string> {
  return nextOrderNumber(new Date().getUTCFullYear());
}

/**
 * A signed link that lets a guest see their own order and nobody else's.
 *
 * A guest has no session, so the order number alone would be the only thing
 * standing between a stranger and someone's address — and order numbers are
 * sequential, so guessing the next one is trivial. The token is an HMAC of the
 * order number under the app's existing session secret: unguessable, tied to
 * that one order, and requiring no storage.
 *
 * Not an expiring token. A delivery confirmation is worth reading weeks later,
 * and an order page that dies after an hour would send people to support
 * instead.
 */
function orderSecret(): Buffer {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET is missing or too short; guest order links cannot be signed.",
    );
  }
  return Buffer.from(secret, "utf8");
}

export function signOrderToken(orderNumber: string): string {
  return createHmac("sha256", orderSecret()).update(orderNumber, "utf8").digest("hex").slice(0, 32);
}

/** Constant-time, and false for anything malformed rather than throwing. */
export function verifyOrderToken(orderNumber: string, token: string | undefined): boolean {
  if (!token) return false;
  try {
    const expected = Buffer.from(signOrderToken(orderNumber), "utf8");
    const given = Buffer.from(token, "utf8");
    if (expected.length !== given.length) return false;
    return timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

/** The link a guest is given after checkout, and in their confirmation email. */
export function guestOrderPath(orderNumber: string): string {
  return `/orders/${orderNumber}?t=${signOrderToken(orderNumber)}`;
}
