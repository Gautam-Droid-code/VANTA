"use client";

import { useEffect, useState } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

/**
 * The measurement itself, in one place so the two hooks below cannot drift.
 *
 * Returns 0 when the page is too short to scroll — a progress rail that sat
 * permanently full would be reporting something untrue.
 */
function readProgress(): number {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  return scrollable <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / scrollable));
}

/**
 * How far down the page the reader is, 0 → 1.
 *
 * Same shape as `useScrolled`: passive listener plus rAF, so reading the
 * position never fights the scroll it is measuring. Lenis drives scrolling on
 * the storefront but still moves the real scroll position, so there is nothing
 * to special-case here.
 *
 * Returns 0 when the page is too short to scroll — a progress rail that sits
 * permanently full would be reporting something untrue.
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => setProgress(readProgress());

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        measure();
        frame = 0;
      });
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Pinned scroll scenes change the document height after mount, which moves
    // the denominator — without this the rail would be scaled to a stale page.
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}

/**
 * The same measurement as a `MotionValue` instead of React state.
 *
 * For anything that paints on **every** scroll frame. `useScrollProgress`
 * above re-renders its component each time the number changes, which is right
 * for a value read during render and wrong for one driving an animation: at
 * 60fps it means 60 reconciliations a second competing with Lenis and GSAP for
 * the frame. A `MotionValue` is written straight to the DOM node by Framer
 * with no render at all — see `components/BackToTop.tsx`, which springs from
 * this.
 *
 * Deliberately not Framer's own `useScroll`, which measures through
 * `ResizeObserver`. This is a plain passive listener over
 * `document.documentElement`, which is the same thing the rest of the
 * storefront's scroll code does, has no observer to fail to initialise, and
 * keeps one definition of "how far down are we" for the whole site.
 */
export function useScrollProgressValue(): MotionValue<number> {
  const progress = useMotionValue(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => progress.set(readProgress());

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Pinned scroll scenes change the document height after mount, which moves
    // the denominator — without this the dial would be scaled to a stale page.
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [progress]);

  return progress;
}
