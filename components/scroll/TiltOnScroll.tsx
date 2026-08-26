"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/format";

/**
 * A slow camera move across a single subject: the frame enters tilted away and
 * rotates to square as it reaches the middle of the viewport, then past it.
 *
 * Rotation is small on purpose. Anything past ~8° stops reading as a camera and
 * starts reading as a CSS trick.
 */
export function TiltOnScroll({
  children,
  className,
  rotate = 6,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add(
      { motionOk: "(prefers-reduced-motion: no-preference)", isDesktop: "(min-width: 768px)" },
      (context) => {
        const { motionOk, isDesktop } = context.conditions as {
          motionOk: boolean;
          isDesktop: boolean;
        };
        if (!motionOk) return;

        // Perspective lives on the root, so the rotated element must be a
        // child of it — never the same node.
        const subject =
          el.querySelector<HTMLElement>("[data-tilt-subject]") ??
          el.querySelector<HTMLElement>("[data-tilt-inner]");
        if (!subject) return;
        // Scale the move down on phones rather than switching it off.
        const amount = isDesktop ? rotate : rotate * 0.45;

        const tween = gsap.fromTo(
          subject,
          { rotateY: amount, rotateX: amount * 0.35, y: 30 },
          {
            rotateY: -amount * 0.6,
            rotateX: -amount * 0.2,
            y: -30,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.7,
            },
          },
        );

        return () => tween.scrollTrigger?.kill();
      },
      el,
    );

    return () => mm.revert();
  }, [rotate]);

  return (
    // `overflow-x: clip` (not hidden) contains the rotated frame without
    // creating a scroll container — a 3D rotation pushes the corners past
    // the viewport edge and produced 34px of horizontal overflow.
    <div ref={root} className={cn("[perspective:1200px] overflow-x-clip", className)}>
      <div data-tilt-inner className="[transform-style:preserve-3d]">
        {children}
      </div>
    </div>
  );
}
