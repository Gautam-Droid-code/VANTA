import type { Variants } from "framer-motion";

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

/**
 * The scroll-linked dial on `components/BackToTop.tsx`.
 *
 * A spring rather than a `duration`, because the input is continuous. A
 * duration-based tween restarts on every new target, so at 60fps it never
 * finishes one and the result reads as stutter — which is precisely how that
 * control shipped and had to be fixed. A spring is re-targeted instead:
 * velocity carries across updates, so a stream of positions resolves into one
 * movement.
 *
 * Damping ratio is `damping / (2 * sqrt(stiffness * mass))` = **1.5**, i.e.
 * overdamped: it settles onto the value without ever crossing it. That matters
 * more here than it usually does, because the reader can *see* the quantity
 * this is reporting. An indicator that wobbles past the truth and comes back
 * is worse than one that arrives a moment late.
 *
 * Not tuned by feel alone — the first attempt was `stiffness: 140,
 * damping: 26, mass: 0.35`, a ratio of 1.86, which is so far overdamped it
 * reads as drag rather than weight. These are the values Framer's own
 * scroll-linked examples use, and they are a sensible default for exactly this
 * shape of problem.
 */
export const scrollDial = {
  stiffness: 100,
  damping: 30,
  mass: 1,
  /** Settles rather than animating forever over sub-pixel differences. */
  restDelta: 0.001,
} as const;
