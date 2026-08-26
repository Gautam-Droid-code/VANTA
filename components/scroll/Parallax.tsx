"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/format";

/**
 * Multi-depth parallax. Children carrying `data-depth` drift at different rates
 * as the group crosses the viewport, which is what reads as depth rather than
 * as "things sliding".
 *
 * `depth` is a multiplier: 0 is locked to the page, 1 drifts a full 100px over
 * the scroll range. Keep foreground subjects low (0.2–0.4) and captions or
 * background marks higher — the eye reads the *difference* between layers, so
 * small spreads are enough.
 */
export function ParallaxGroup({
  children,
  className,
  distance = 90,
}: {
  children: React.ReactNode;
  className?: string;
  /** Base travel in px that a depth of 1 will move across the whole range. */
  distance?: number;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const layers = gsap.utils.toArray<HTMLElement>("[data-depth]", el);
      const tweens = layers.map((layer) => {
        const depth = Number(layer.dataset.depth ?? 0);
        return gsap.fromTo(
          layer,
          { y: 0 },
          {
            y: -distance * depth,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.5,
            },
          },
        );
      });

      return () => tweens.forEach((t) => t.scrollTrigger?.kill());
    }, el);

    return () => mm.revert();
  }, [distance]);

  return (
    <div ref={root} className={cn(className)}>
      {children}
    </div>
  );
}
