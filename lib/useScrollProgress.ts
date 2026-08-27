"use client";

import { useEffect, useState } from "react";

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

    const measure = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      setProgress(scrollable <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / scrollable)));
    };

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
