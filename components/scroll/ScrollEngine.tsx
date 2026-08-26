"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Storefront scroll engine: Lenis smooth scroll driven by GSAP's ticker, with
 * ScrollTrigger kept in sync.
 *
 * Mounted by the storefront page only — NOT in the root layout. The admin is a
 * data-entry tool where smooth-scroll hijacking would fight form focus,
 * `scrollIntoView`, and the drawers' own scroll containers.
 *
 * Reduced motion: when the user asks for it, Lenis is never started at all, so
 * scrolling stays entirely native. Individual scenes register their animations
 * inside `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`, so
 * reverting that context restores every element to its resting CSS state.
 */
export function ScrollEngine() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      // Native scrolling, no pinning, no scrub. Scenes opt out on their own too.
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      // Slightly weighted ease-out — reads as momentum, not lag.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Touch keeps the platform's own scrolling; see mobile note in DECISIONS.
      syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    // Dev-only handle so automated scroll checks can drive the real
    // scroller instead of fighting Lenis with window.scrollTo.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    }

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Images finishing late change document height and invalidate trigger math.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const t = window.setTimeout(refresh, 600);

    return () => {
      window.removeEventListener("load", refresh);
      window.clearTimeout(t);
      gsap.ticker.remove(raf);
      if (process.env.NODE_ENV !== "production") {
        delete (window as unknown as { __lenis?: Lenis }).__lenis;
      }
      lenis.destroy();
      ScrollTrigger.getAll().forEach((s) => s.kill());
    };
  }, []);

  return null;
}
