import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { hasDatabase, prisma } from "@/lib/db";
import { drainCourierQueue } from "@/lib/shipping/courierPush";
import { courierStatusToOrderStatus } from "@/lib/shipping/courierStatus";
import { isShiprocketConfigured, trackByAwb } from "@/lib/shipping/shiprocket";

/**
 * The courier sync.
 *
 * Two jobs, both of which exist because a webhook is a promise, not a
 * guarantee:
 *
 * 1. **Drain the push queue.** Orders queued for Shiprocket while it was
 *    unreachable get another attempt, with the backoff `lib/outbox.ts` applies.
 *    This is the mechanism that makes "an order is never blocked by the
 *    courier" true rather than aspirational — the order was accepted, and this
 *    is where it eventually reaches them.
 *
 * 2. **Poll tracking for in-flight shipments.** The tracking webhook is the
 *    primary path and this is the safety net: a webhook delivered while the
 *    site was deploying, or dropped by their retry policy, would otherwise
 *    leave an order stuck on a status it left days ago. Polling a bounded set
 *    of *active* shipments costs a handful of calls and removes an entire
 *    class of "my order still says packed" support mail.
 *
 * Meant to be run on a schedule — a Vercel cron every fifteen minutes is
 * plenty. Safe to run more often, safe to run twice at once: pushing is
 * idempotent on `shiprocketOrderId`, and tracking writes are last-write-wins
 * over data that is already a snapshot.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bounded per invocation. A queue drains over several runs, not one long one. */
const PUSH_LIMIT = 10;
const TRACK_LIMIT = 25;

export async function GET(request: Request) {
  /**
   * Authorised by a shared secret, in a header or `Authorization: Bearer`.
   *
   * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`, so both forms are
   * accepted. Unset means the route refuses everything: this endpoint spends
   * money on someone else's API, and an open version of it is a way for a
   * stranger to run up a bill.
   */
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer /i, "") ??
    null;

  if (!matches(secret, provided)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  if (!hasDatabase() || !isShiprocketConfigured()) {
    return NextResponse.json({ ok: true, skipped: "not-configured" });
  }

  const pushed = await drainCourierQueue(PUSH_LIMIT);
  const tracked = await refreshTracking(TRACK_LIMIT);

  return NextResponse.json({ ok: true, pushed, tracked });
}

/**
 * Re-reads tracking for shipments that are still moving.
 *
 * Scoped tightly on purpose: only orders with an AWB, and only those not yet
 * delivered or closed. Polling delivered orders forever would grow linearly
 * with every order ever placed, which is how a cheap safety net becomes an
 * expensive one.
 */
async function refreshTracking(limit: number): Promise<{ checked: number; changed: number }> {
  const orders = await prisma.order.findMany({
    where: {
      awb: { not: null },
      status: { in: ["PACKED", "SHIPPED"] },
    },
    // Oldest-updated first, so a large backlog rotates through rather than the
    // same few orders being re-checked every run.
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true, awb: true, status: true, courierStatus: true },
  });

  let changed = 0;

  for (const order of orders) {
    const result = await trackByAwb(order.awb!);
    // Fail soft, per shipment. One unreachable AWB must not abort the run and
    // leave the rest of the batch unchecked.
    if (!result.ok) continue;

    const courierStatus = result.value.currentStatus;
    const next = courierStatusToOrderStatus(courierStatus, order.status);

    if (courierStatus === order.courierStatus && !next) continue;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        courierStatus,
        ...(result.value.courierName ? { courierName: result.value.courierName } : {}),
        ...(next ? { status: next } : {}),
      },
    });
    changed++;
  }

  return { checked: orders.length, changed };
}

function matches(expected: string, given: string | null): boolean {
  if (!given) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
