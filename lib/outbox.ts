import "server-only";

import { prisma } from "@/lib/db";

/**
 * The outbox.
 *
 * Everything that leaves this application for a third party — pushing an order
 * to a courier, most obviously — is written here first and performed second.
 * The reason is a rule that applies to every external call in this codebase:
 * **an outside service being down must never stop an order being placed.**
 *
 * So the checkout transaction writes a row saying "this order needs pushing",
 * and that write either commits with the order or does not happen at all. The
 * push itself is then somebody else's problem: a drain route, a cron, or an
 * admin pressing a button. If Shiprocket is unreachable for six hours, six
 * hours of orders are sitting here waiting, and the customers who placed them
 * never saw a thing.
 *
 * Deliberately not a queue service. A table with `runAfter` and `attempts` is
 * enough at this size, it is transactional with the data it describes — which
 * no external queue can be — and it is inspectable with SQL when something
 * goes wrong at 2am.
 */

export const COURIER_PUSH = "shiprocket.push";

/** Roughly 1m, 5m, 25m, 2h, 10h — enough to ride out an outage. */
export function backoffMs(attempts: number): number {
  return Math.min(60_000 * 5 ** attempts, 12 * 60 * 60 * 1000);
}

/**
 * Any Prisma client — the real one, or a transaction client. Callers inside a
 * transaction must pass `tx`, or the job can commit while the order rolls back.
 */
type Db = Pick<typeof prisma, "outboxJob">;

/**
 * Queues a job, at most one outstanding per (kind, order).
 *
 * Idempotent by design rather than by unique index: this is called from the
 * payment webhook, which is itself retried by Razorpay, and from the admin's
 * re-push button. Three calls must leave one pending job, not three.
 */
export async function enqueue(kind: string, orderId: string, db: Db = prisma): Promise<void> {
  const pending = await db.outboxJob.findFirst({
    where: { kind, orderId, completedAt: null },
    select: { id: true },
  });
  if (pending) return;

  await db.outboxJob.create({ data: { kind, orderId } });
}

/** Marks a job done. The row is kept — it is the record that this happened. */
export async function complete(id: string): Promise<void> {
  await prisma.outboxJob.update({
    where: { id },
    data: { completedAt: new Date(), lastError: null },
  });
}

/**
 * Records a failure and pushes the job into the future.
 *
 * Never deletes and never gives up. A job that has failed twenty times is a
 * thing an admin should see in the shipments view, not something that quietly
 * disappeared along with the order it was supposed to ship.
 */
export async function fail(id: string, attempts: number, error: string): Promise<void> {
  await prisma.outboxJob.update({
    where: { id },
    data: {
      attempts: attempts + 1,
      lastError: error.slice(0, 500),
      runAfter: new Date(Date.now() + backoffMs(attempts)),
    },
  });
}

/** Jobs that are due. Ordered oldest first so nothing starves behind a retry. */
export async function claimDue(kind: string, limit = 10) {
  return prisma.outboxJob.findMany({
    where: { kind, completedAt: null, runAfter: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}
