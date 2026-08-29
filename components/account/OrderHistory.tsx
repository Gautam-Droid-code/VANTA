import Link from "next/link";
import { formatPaise } from "@/lib/money";

/**
 * Past orders on the account page.
 *
 * A server component — it renders data the page already fetched and needs no
 * interactivity. Every value shown comes from the order's own snapshot, so a
 * product renamed or repriced since does not change what a past order says.
 */
export interface OrderSummaryRow {
  orderNumber: string;
  placedAt: Date;
  status: string;
  total: number;
  itemCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function OrderHistory({ orders }: { orders: OrderSummaryRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="border border-ink-line px-4 py-5">
        <p className="text-sm text-bone/60">No orders yet.</p>
        <Link
          href="/products"
          className="mt-3 inline-block text-label font-bold uppercase text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-ink-line border-y border-ink-line">
      {orders.map((order) => (
        <li key={order.orderNumber}>
          <Link
            href={`/orders/${order.orderNumber}`}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4 transition-opacity hover:opacity-70"
          >
            <span className="text-sm text-bone">{order.orderNumber}</span>
            <span className="text-xs text-bone/40">
              {order.placedAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-bone/40">
              {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
            </span>
            <span className="text-xs uppercase tracking-[0.12em] text-bone/50">
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
            <span className="ml-auto text-sm tabular-nums text-bone">
              {formatPaise(order.total)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
