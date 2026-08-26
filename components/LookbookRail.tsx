"use client";

import { motion } from "framer-motion";
import { duration, ease, inView, stagger } from "@/lib/motion";
import { useActiveSnap } from "@/lib/useActiveSnap";
import { cn } from "@/lib/format";

interface LookbookRailProps {
  /** Server-rendered slides, each wrapped in a `RevealItem`. */
  children: React.ReactNode;
  /** Captions drive the dot labels; kept separate so slides stay server-rendered. */
  captions: string[];
  className?: string;
}

/**
 * Client leaf: owns the scroll-snap rail ref and the dot indicators.
 *
 * Scrolling remains native CSS scroll-snap (DECISIONS.md §3) — `useActiveSnap`
 * only observes position to light the right dot. The slides themselves are
 * server-rendered and passed in as `children`.
 */
export function LookbookRail({ children, captions, className }: LookbookRailProps) {
  const { ref, active, scrollTo } = useActiveSnap<HTMLDivElement>(captions.length);

  return (
    <>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={inView}
        variants={stagger(0.08)}
        ref={ref}
        className={cn(className)}
      >
        {children}
      </motion.div>

      {/* Dot indicators — mobile only */}
      <div className="mt-6 flex items-center justify-center gap-2 px-gutter lg:hidden">
        {captions.map((caption, i) => (
          <button
            key={caption}
            type="button"
            onClick={() => scrollTo(i)}
            aria-label={`Go to ${caption}`}
            aria-current={i === active}
            className="group p-2"
          >
            <motion.span
              className="block h-[3px] rounded-full bg-bone"
              animate={{
                width: i === active ? 28 : 8,
                // 0.45 keeps inactive dots subtle while clearing the 3:1 WCAG
                // minimum for non-text indicators (measured 4.34:1 on #0D0D0D).
                opacity: i === active ? 1 : 0.45,
              }}
              transition={{ duration: duration.base, ease: ease.inOut }}
            />
          </button>
        ))}
      </div>
    </>
  );
}
