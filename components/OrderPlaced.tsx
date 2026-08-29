"use client";

import { useEffect, useRef } from "react";
import { useBag } from "@/components/BagProvider";

/**
 * Clears the browser's bag once an order exists.
 *
 * Renders nothing. Mounted only on the order page, and only for an order that
 * was just placed.
 *
 * The server half is already done inside `createOrder`'s transaction — the
 * `BagLine` mirror is deleted alongside the order, so an order and a full
 * server bag can never both exist. This is the other half: `localStorage` is
 * the authority for the bag (§21), and the server cannot reach it.
 *
 * Clearing on the order page rather than in the action is deliberate. The
 * action redirects, and a client store cleared optimistically before a redirect
 * that then failed would empty someone's bag without giving them an order.
 * Arriving here is proof the order exists.
 */
export function OrderPlaced({ orderNumber }: { orderNumber: string }) {
  const { clear, hydrated } = useBag();

  /**
   * Once per order, not once per mount. Without this, a customer re-opening
   * this URL later — from a confirmation email, say — would have whatever is
   * in their bag at that moment wiped by an order they placed last week.
   */
  const cleared = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (cleared.current === orderNumber) return;

    const key = `vanta_order_cleared_${orderNumber}`;
    try {
      if (window.localStorage.getItem(key)) {
        cleared.current = orderNumber;
        return;
      }
      window.localStorage.setItem(key, "1");
    } catch {
      // Storage unavailable. Clearing the bag is still the right thing to do
      // for this page view; it just may repeat on a later visit.
    }

    cleared.current = orderNumber;
    clear();
  }, [orderNumber, clear, hydrated]);

  return null;
}
