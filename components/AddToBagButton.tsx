"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useBag } from "@/components/BagProvider";
import { duration, ease, tapScale } from "@/lib/motion";
import { cn } from "@/lib/format";

/**
 * Adds one product to the bag.
 *
 * Confirms in place rather than navigating. Sending someone to the bag on
 * every add interrupts the thing they were doing — browsing — and makes buying
 * a second item cost two extra page loads. The button states what happened and
 * offers the bag as a choice.
 */
export function AddToBagButton({ productId }: { productId: string }) {
  const { add, hydrated } = useBag();
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clearing on unmount stops the timer firing into a component that has gone.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = () => {
    add(productId);
    setJustAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 4000);
  };

  return (
    <div className="space-y-3">
      <motion.button
        type="button"
        onClick={onClick}
        /**
         * Disabled until the stored bag has been read. A click before that
         * would add to an empty bag and then be overwritten by whatever was
         * already saved — the item would silently vanish.
         */
        disabled={!hydrated}
        whileTap={hydrated ? tapScale : undefined}
        transition={{ duration: duration.fast, ease: ease.inOut }}
        className={cn(
          "inline-flex w-full items-center justify-center rounded-full px-8 py-4 text-label-lg font-bold uppercase transition-colors duration-200 ease-in-out sm:w-auto",
          "bg-bone text-ink hover:bg-white",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {justAdded ? "Added to bag" : "Add to bag"}
      </motion.button>

      {/*
        `aria-live` so the confirmation reaches a screen reader too — the
        button's own label changing is easy to miss, and the count in the
        header is nowhere near the focus.
      */}
      <p aria-live="polite" className="min-h-[1.25rem] text-sm text-bone/60">
        {justAdded ? (
          <>
            Added.{" "}
            <Link
              href="/bag"
              className="text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              View bag
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
