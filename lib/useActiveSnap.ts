"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks which item of a scroll-snap rail is centred, for dot indicators.
 *
 * Deliberately read-only: scrolling stays native CSS scroll-snap (real momentum,
 * 60fps on mobile). This only *observes* position — it never drives it.
 */
export function useActiveSnap<T extends HTMLElement>(itemCount: number) {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || itemCount === 0) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const items = Array.from(el.children) as HTMLElement[];
        if (!items.length) return;
        const centre = el.scrollLeft + el.clientWidth / 2;
        let closest = 0;
        let min = Infinity;
        items.forEach((item, i) => {
          const itemCentre = item.offsetLeft + item.offsetWidth / 2;
          const dist = Math.abs(itemCentre - centre);
          if (dist < min) {
            min = dist;
            closest = i;
          }
        });
        setActive(closest);
      });
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [itemCount]);

  /** Jump to an item — used by the dots. Honours reduced motion. */
  const scrollTo = useCallback((index: number) => {
    const el = ref.current;
    if (!el) return;
    const item = el.children[index] as HTMLElement | undefined;
    if (!item) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: item.offsetLeft - (el.clientWidth - item.offsetWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, []);

  return { ref, active, scrollTo };
}
