import type { Transition, Variants } from "framer-motion";

/**
 * One easing vocabulary for the whole site.
 * `out` for entrances, `inOut` for hovers/state changes.
 */
export const ease = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const duration = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

export const springTap: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

/** Standard fade-up used by every section on scroll-into-view. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.out },
  },
};

/** Smaller offset for items inside an already-animating group. */
export const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: ease.out },
  },
};

/** Parent that staggers its children (product cards, grid columns, words). */
export const stagger = (staggerChildren = 0.07, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
});

/** Hero headline: line-by-line reveal, masked by an overflow-hidden parent. */
export const lineReveal: Variants = {
  hidden: { opacity: 0, y: "100%" },
  visible: {
    opacity: 1,
    y: "0%",
    transition: { duration: 0.55, ease: ease.out },
  },
};

/** Shared viewport config so sections trigger consistently. */
export const inView = { once: true, amount: 0.25, margin: "0px 0px -10% 0px" } as const;

/** Tactile press feedback for buttons and tappable rows. */
export const tapScale = { scale: 0.97 };
