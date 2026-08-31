import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hasDatabase, prisma } from "@/lib/db";
import { COURIER_PUSH, enqueue } from "@/lib/outbox";
import {
  HANDLED_EVENTS,
  readWebhookFacts,
  verifyWebhookSignature,
} from "@/lib/payments/razorpay";

/**
 * Razorpay's webhook.
 *
 * ## This, not the browser, decides whether an order is paid
 *
 * Razorpay's checkout hands control back to the browser after a payment, and
 * it is tempting to mark the order paid there — the customer is right in front
 * of you and it takes one line. It is also wrong, and the failure is silent.
 *
 * The browser is not a reliable narrator of a payment:
 *
 * - It may never come back. A UPI payment finishes in a banking app; the
 *   customer's phone rings, they answer it, the tab is gone. The money moved.
 * - The network may drop between the bank's confirmation and our callback.
 * - The callback is a request the customer's machine makes, which means the
 *   customer can make it too — with different arguments. A paid order that
 *   anyone can create by hand is not a paid order.
 *
 * So: **the webhook is the source of truth.** A browser that never comes back
 * must not lose a paid order, and it does not, because Razorpay delivers this
 * event regardless of what the browser did. The return from checkout does
 * nothing but reload the order page and show whatever this handler has
 * already recorded.
 *
 * ## Verify before touching anything
 *
 * The signature is checked against the *raw* body, before parsing, before any
 * database read, before logging anything as an event. This endpoint is public
 * and unauthenticated by nature; an unsigned request is not a payment
 * notification, it is a stranger, and a stranger must not be able to cause so
 * much as a row to be written.
 *
 * ## Idempotent
 *
 * Razorpay retries on any non-2xx and can deliver the same event more than
 * once regardless. Every event is recorded in `WebhookEvent` under a unique
 * (provider, eventKey) index, and that insert happens *first*: if it raises a
 * uniqueness violation, this delivery is a duplicate and we return 200 having
 * changed nothing. The database enforces it, not a check-then-act read, which
 * would race against a concurrent redelivery.
 *
 * On top of that, the order update is itself conditional — it only moves an
 * order that is still PENDING_PAYMENT — so even a duplicate that somehow got
 * past the index cannot overwrite a later state or re-stamp `paidAt`.
 */

/** Node runtime: signature verification needs `node:crypto`. */
export const runtime = "nodejs";
/** Never cached, never prerendered — a POST endpoint with side effects. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  /**
   * Read the body as text and keep it that way.
   *
   * `request.json()` would parse and discard the bytes, and the signature is
   * over the bytes. Re-serialising a parsed object changes key order and
   * whitespace, and the HMAC then never matches — a class of bug that looks
   * like "Razorpay is sending bad signatures".
   */
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    // 400, not 401: there is no authentication to retry with, and Razorpay
    // should not queue redeliveries of something we will never accept.
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }

  // Only past this line is the request trusted enough to parse.
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const facts = readWebhookFacts(body);
  if (!facts) {
    // Signed by Razorpay but shaped like nothing we recognise. Logged loudly
    // and NOT acknowledged as processed, so their retries keep it visible
    // rather than it disappearing into a 200.
    console.error("[razorpay] signed event in an unrecognised shape", raw.slice(0, 500));
    return NextResponse.json({ error: "unrecognised-payload" }, { status: 422 });
  }

  /**
   * No database means nothing to record against. 503 rather than 200, so
   * Razorpay retries once the site is configured instead of treating a
   * payment as delivered into a void.
   */
  if (!hasDatabase()) {
    return NextResponse.json({ error: "no-database" }, { status: 503 });
  }

  /**
   * The idempotency key.
   *
   * `x-razorpay-event-id` is Razorpay's own per-event identifier and is stable
   * across retries of the same event. When it is absent, a hash of the exact
   * body stands in: two deliveries of the same event have byte-identical
   * bodies, and two genuinely different events do not.
   */
  const eventKey =
    request.headers.get("x-razorpay-event-id") ??
    createHash("sha256").update(raw, "utf8").digest("hex");

  try {
    await prisma.webhookEvent.create({
      data: { provider: "razorpay", eventKey, eventType: facts.event },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // Already handled. Deliberately 200: this is success, not conflict.
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw error;
  }

  if (!HANDLED_EVENTS.has(facts.event)) {
    // Subscribed to more than we act on, which is fine — acknowledged so it is
    // not redelivered forever, and recorded above so it stays auditable.
    return NextResponse.json({ ok: true, ignored: facts.event });
  }

  if (!facts.orderId) {
    console.error("[razorpay] handled event with no order id:", facts.event);
    return NextResponse.json({ ok: true, ignored: "no-order-id" });
  }

  const order = await prisma.order.findUnique({
    where: { razorpayOrderId: facts.orderId },
    select: { id: true, status: true, total: true, paidAt: true },
  });

  if (!order) {
    /**
     * Signed, valid, and about an order we have never heard of — which means
     * the same Razorpay account is being used by another environment, a
     * staging deploy most likely. Acknowledged so their retries stop, and
     * logged so it is findable.
     */
    console.error("[razorpay] no local order for", facts.orderId);
    return NextResponse.json({ ok: true, ignored: "unknown-order" });
  }

  if (facts.event === "payment.failed") {
    /**
     * A failed payment is NOT a cancelled order.
     *
     * A declined card is very often followed by a successful one a minute
     * later against the same Razorpay order. Cancelling here would destroy an
     * order the customer is in the middle of paying for. It stays
     * PENDING_PAYMENT and simply remains unpaid.
     */
    return NextResponse.json({ ok: true, noted: "payment-failed" });
  }

  /**
   * Paid — but only for the amount we asked for.
   *
   * The amount comes from Razorpay, who got it from the order *we* created
   * server-side, so a mismatch should be impossible. It is checked anyway,
   * because the cost of being wrong is shipping goods for less than they cost
   * and the check is one comparison. Both sides are paise; see
   * `lib/payments/razorpay.ts` for why no conversion happens anywhere.
   */
  if (facts.amount !== null && facts.amount !== order.total) {
    console.error(
      `[razorpay] amount mismatch on ${facts.orderId}: paid ${facts.amount}, expected ${order.total}`,
    );
    return NextResponse.json({ ok: true, ignored: "amount-mismatch" });
  }

  /**
   * Conditional on the order still awaiting payment.
   *
   * `updateMany` with the status in the WHERE clause makes this one atomic
   * statement: `payment.captured` and `order.paid` arrive for the same payment
   * and race, and exactly one of them updates a row. The other updates nothing
   * and moves on, rather than both reading PENDING_PAYMENT and both writing.
   */
  const updated = await prisma.order.updateMany({
    where: { id: order.id, status: "PENDING_PAYMENT" },
    data: {
      status: "CONFIRMED",
      razorpayPaymentId: facts.paymentId,
      paidAt: new Date(),
    },
  });

  if (updated.count > 0) {
    /**
     * Now it can ship. Queued rather than pushed: this handler owes Razorpay a
     * fast 2xx, and Shiprocket being slow or down must not turn a captured
     * payment into a webhook timeout and a retry storm. See `lib/outbox.ts`.
     */
    await enqueue(COURIER_PUSH, order.id);
  }

  return NextResponse.json({ ok: true, updated: updated.count });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
