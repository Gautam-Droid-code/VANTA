import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { hasDatabase, prisma } from "@/lib/db";
import { courierStatusToOrderStatus } from "@/lib/shipping/courierStatus";

/**
 * Shiprocket's tracking webhook.
 *
 * Configured in their dashboard under Settings → API → Webhooks. Their
 * documentation specifies: a POST of `application/json`, an optional security
 * token sent as an `x-api-key` header, and that the endpoint must answer 200.
 *
 * It also states plainly that the webhook URL must not contain the keywords
 * "shiprocket", "kartrocket", "sr" or "kr". That is why this route is
 * `/api/webhooks/courier` and not `/api/webhooks/shiprocket`, which is the
 * name it would otherwise have had — their filter would have rejected the
 * registration, and the symptom would have been tracking updates that simply
 * never arrived.
 *
 * The payload shape is theirs, from the documented sample: `awb`,
 * `courier_name`, `current_status`, `current_timestamp`, `order_id`,
 * `sr_order_id`, `etd`, and a `scans` array.
 *
 * Unlike Razorpay's, this webhook carries no signature — only a shared token —
 * so it is authenticated but not tamper-evident. That shapes what it is
 * allowed to do: it updates *delivery* state and nothing else. It cannot mark
 * an order paid, cannot change a total, and cannot create anything. The worst
 * a forged call could achieve is a wrong tracking label on an order whose AWB
 * the attacker already knew.
 */

/** Node runtime for `node:crypto`; dynamic because it has side effects. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  /**
   * The shared token, compared in constant time.
   *
   * When SHIPROCKET_WEBHOOK_TOKEN is unset the endpoint refuses everything
   * rather than accepting everything. An unauthenticated public endpoint that
   * rewrites order state is not an acceptable default, and Shiprocket's token
   * field being "not mandatory" on their side does not make it optional here.
   */
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  if (!tokenMatches(expected, request.headers.get("x-api-key"))) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ error: "no-database" }, { status: 503 });
  }

  const raw = await request.text();
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const awb = str(body.awb);
  const orderRef = str(body.order_id);
  const courierStatus = str(body.current_status);
  const courierName = str(body.courier_name);

  if (!awb && !orderRef) {
    return NextResponse.json({ error: "no-identifier" }, { status: 400 });
  }

  /**
   * Idempotency, same mechanism as the payment webhook: a unique index does
   * the enforcing, not a read followed by a write.
   *
   * The key is the AWB plus the status plus their timestamp. Shiprocket sends
   * one call per tracking event and retries on failure, so a redelivery has an
   * identical triple while a genuine next event does not. A hash of the body
   * would also work but would treat a reordered `scans` array as a new event.
   */
  const eventKey = `${awb ?? orderRef}:${courierStatus ?? "?"}:${str(body.current_timestamp) ?? ""}`;

  try {
    await prisma.webhookEvent.create({
      data: {
        provider: "shiprocket",
        eventKey: createHash("sha256").update(eventKey, "utf8").digest("hex"),
        eventType: courierStatus,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ ok: true, duplicate: true });
    throw error;
  }

  /**
   * Found by AWB first.
   *
   * Their `order_id` is a composite of their internal ids in the documented
   * sample, not necessarily the `order_id` we sent, so matching on it alone
   * would be unreliable. The AWB is unambiguous and is what we stored when the
   * shipment was created.
   */
  const order = await prisma.order.findFirst({
    where: awb ? { awb } : { orderNumber: orderRef! },
    select: { id: true, status: true },
  });

  if (!order) {
    // Acknowledged with 200 as their docs require, but logged: a tracking
    // update for an unknown shipment usually means two environments sharing
    // one Shiprocket account.
    console.error("[shiprocket] tracking update for unknown shipment", awb ?? orderRef);
    return NextResponse.json({ ok: true, ignored: "unknown-shipment" });
  }

  const next = courierStatusToOrderStatus(courierStatus, order.status);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      // Stored verbatim and shown verbatim. Their status vocabulary is richer
      // than ours and mapping it away would lose detail a customer wants.
      courierStatus,
      ...(courierName ? { courierName } : {}),
      ...(next ? { status: next } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

function tokenMatches(expected: string, given: string | null): boolean {
  if (!given) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function str(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
