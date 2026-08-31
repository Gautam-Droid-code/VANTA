"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminSession";
import { recordAudit } from "@/lib/auditLog";
import { hasDatabase, prisma } from "@/lib/db";
import { COURIER_PUSH, enqueue } from "@/lib/outbox";
import { drainCourierQueue, pushOrderToCourier } from "@/lib/shipping/courierPush";

/**
 * Staff actions on the shipments view.
 *
 * Both re-establish the caller with `requireAdmin()` rather than trusting the
 * page that rendered the button — a Server Action is a public endpoint with a
 * hard-to-guess name, and the admin layout's session check does not cover it.
 */

/**
 * Push one order to the courier, now.
 *
 * The button exists because the outbox drains on a schedule, and "on a
 * schedule" is not good enough when someone is standing at a packing table
 * waiting for a label. It queues *and* runs, so the retry machinery still owns
 * the outcome if this attempt fails.
 */
export async function rePushOrderAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!hasDatabase()) return;

  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true },
  });
  if (!order) return;

  await enqueue(COURIER_PUSH, order.id);
  const result = await pushOrderToCourier(order.id);

  await recordAudit({
    actor: admin.username,
    action: result.ok ? "courier.pushed" : "courier.push_failed",
    target: order.orderNumber,
  });

  revalidatePath("/admin/orders");
}

/** Works through whatever is due, for when a backlog needs clearing by hand. */
export async function drainQueueAction(): Promise<void> {
  const admin = await requireAdmin();
  if (!hasDatabase()) return;

  const { done, failed } = await drainCourierQueue(25);

  await recordAudit({
    actor: admin.username,
    action: "courier.queue_drained",
    target: `${done} pushed, ${failed} failed`,
  });

  revalidatePath("/admin/orders");
}
