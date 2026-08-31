import Link from "next/link";
import { hasDatabase, prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { COURIER_PUSH } from "@/lib/outbox";
import { isShiprocketConfigured } from "@/lib/shipping/shiprocket";
import { Button, Card, CardHeader, Pill } from "@/components/admin/ui";
import { drainQueueAction, rePushOrderAction } from "./actions";

/**
 * Orders and shipments.
 *
 * The screen someone stands in front of while packing. It answers three
 * questions in the order they get asked: what needs shipping, what has gone
 * wrong, and where is everything else.
 *
 * Read-only apart from re-pushing. An order is a record of something that
 * happened, and this is not the place to edit one — the status moves because
 * the courier said so, not because a button was pressed.
 */
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "accent" | "muted"> = {
  PENDING_PAYMENT: "muted",
  CONFIRMED: "accent",
  PACKED: "accent",
  SHIPPED: "accent",
  DELIVERED: "neutral",
  CANCELLED: "muted",
  REFUNDED: "muted",
};

export default async function AdminOrdersPage() {
  if (!hasDatabase()) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Header />
        <Card>
          <div className="p-5">
            <p className="text-sm text-admin-ink">Orders need a database.</p>
            <p className="mt-2 text-sm text-admin-muted">
              Set <code>DATABASE_URL</code> to turn on checkout, orders and
              shipments. Without one the storefront still runs — the bag stays in
              the browser and checkout says it isn&rsquo;t available.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const [orders, pendingJobs, failingJobs] = await Promise.all([
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        placedAt: true,
        status: true,
        paymentMethod: true,
        paidAt: true,
        total: true,
        shipName: true,
        shipCity: true,
        shipPincode: true,
        awb: true,
        courierName: true,
        courierStatus: true,
        trackingUrl: true,
        shiprocketOrderId: true,
        courierError: true,
      },
    }),
    prisma.outboxJob.count({ where: { kind: COURIER_PUSH, completedAt: null } }),
    prisma.outboxJob.count({ where: { kind: COURIER_PUSH, completedAt: null, attempts: { gt: 0 } } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Header />

      {!isShiprocketConfigured() && (
        <Card>
          <div className="p-5">
            <p className="text-sm text-admin-ink">The courier isn&rsquo;t connected.</p>
            <p className="mt-2 text-sm text-admin-muted">
              Orders are still taken and still recorded — nothing about the
              storefront depends on Shiprocket. They simply queue here until
              <code className="mx-1">SHIPROCKET_EMAIL</code>,
              <code className="mx-1">SHIPROCKET_PASSWORD</code> and
              <code className="mx-1">SHIPROCKET_PICKUP_LOCATION</code> are set.
            </p>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Courier queue"
          hint="Orders waiting to be handed over. They retry on their own; this is for when you don't want to wait."
        />
        <div className="flex flex-wrap items-center gap-4 p-5">
          <p className="text-sm text-admin-muted">
            <span className="font-semibold text-admin-ink">{pendingJobs}</span> waiting
            {failingJobs > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-admin-danger">{failingJobs}</span> retrying
              </>
            )}
          </p>
          <form action={drainQueueAction} className="ml-auto">
            <Button type="submit" disabled={pendingJobs === 0}>
              Push what&rsquo;s waiting
            </Button>
          </form>
        </div>
      </Card>

      <Card>
        <CardHeader title="Orders" hint="The hundred most recent." />
        <div className="p-5">
          {orders.length === 0 ? (
            <p className="text-sm text-admin-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-admin-border">
              {orders.map((order) => (
                <li key={order.id} className="py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Link
                      href={`/orders/${order.orderNumber}`}
                      target="_blank"
                      className="text-sm font-semibold text-admin-ink hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <Pill tone={STATUS_TONE[order.status] ?? "neutral"}>{order.status}</Pill>
                    <Pill tone={order.paymentMethod === "COD" ? "muted" : order.paidAt ? "accent" : "muted"}>
                      {order.paymentMethod === "COD" ? "COD" : order.paidAt ? "Paid" : "Unpaid"}
                    </Pill>
                    <span className="text-xs text-admin-muted">
                      {order.placedAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="ml-auto text-sm font-medium tabular-nums text-admin-ink">
                      {formatPaise(order.total)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-admin-muted">
                    {order.shipName} · {order.shipCity} {order.shipPincode}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {order.awb ? (
                      <span className="text-xs text-admin-muted">
                        {order.courierStatus ?? "Handed over"}
                        {order.courierName ? ` · ${order.courierName}` : ""} ·{" "}
                        {order.trackingUrl ? (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tabular-nums underline"
                          >
                            {order.awb}
                          </a>
                        ) : (
                          <span className="tabular-nums">{order.awb}</span>
                        )}
                      </span>
                    ) : order.shiprocketOrderId ? (
                      <span className="text-xs text-admin-muted">
                        With the courier, no AWB assigned yet
                      </span>
                    ) : (
                      <span className="text-xs text-admin-muted">Not sent to the courier</span>
                    )}

                    {/*
                      The error is shown next to the order it is about, not only
                      in the queue. Whoever notices a parcel has not moved is
                      looking at the order, not at a job table.
                    */}
                    {order.courierError && (
                      <span className="text-xs text-admin-danger">{order.courierError}</span>
                    )}

                    {/*
                      Offered only where it can do something: an order that is
                      already with the courier, unpaid, or closed has nothing to
                      re-push, and a button that quietly does nothing is worse
                      than no button.
                    */}
                    {!order.shiprocketOrderId &&
                      order.status !== "PENDING_PAYMENT" &&
                      order.status !== "CANCELLED" &&
                      order.status !== "REFUNDED" && (
                        <form action={rePushOrderAction} className="ml-auto">
                          <input type="hidden" name="orderId" value={order.id} />
                          <Button type="submit" variant="ghost" className="px-3 py-1 text-xs">
                            Send to courier
                          </Button>
                        </form>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1 className="font-admin-display text-2xl font-bold tracking-tight text-admin-ink">
        Orders &amp; Shipments
      </h1>
      <p className="mt-1 text-sm text-admin-muted">
        What&rsquo;s been bought, what&rsquo;s been paid for, and where it is.
      </p>
    </header>
  );
}
