/**
 * One way to move the page, whoever is driving it.
 *
 * The storefront has two scroll regimes and they cannot be scrolled the same
 * way:
 *
 * - **Lenis is running** (the homepage — `ScrollEngine` is mounted there and
 *   nowhere else, per §18). Lenis runs its own rAF loop with its own idea of
 *   where the page is. `window.scrollTo` moves the real scroll position without
 *   telling it, so its next frame animates back from the value it still
 *   believes is current — the page fights you and lands somewhere it chose.
 * - **Nothing is running** (every other route, and the homepage under
 *   `prefers-reduced-motion`, where `ScrollEngine` deliberately never starts
 *   Lenis). Native scrolling, so `window.scrollTo` is exactly right.
 *
 * A registry rather than a global. `ScrollEngine` already put its instance on
 * `window.__lenis`, but only under `NODE_ENV !== "production"` — it is a hook
 * for automated scroll checks, not an API, and a control that depended on it
 * would work in development and silently do the wrong thing in production.
 * This is a module-level variable instead: typed, present in every
 * environment, and impossible to reach from outside the bundle.
 *
 * Typed structurally so this module never imports Lenis. It is pulled in by a
 * client component that must not drag the scroll library into its chunk.
 */

interface Scroller {
  scrollTo: (target: number, options?: { immediate?: boolean }) => void;
}

let active: Scroller | null = null;

/**
 * Registers the smooth-scroll engine. Returns its own cleanup, so the caller
 * cannot forget the symmetric deregistration.
 *
 * Guarded on identity: a fast remount can register the new instance before the
 * old one's cleanup runs, and an unguarded `active = null` would then clear the
 * live engine and leave the page with no registered scroller at all.
 */
export function registerScroller(scroller: Scroller): () => void {
  active = scroller;
  return () => {
    if (active === scroller) active = null;
  };
}

/**
 * Scrolls to the top of the page by whichever route is correct right now.
 *
 * `instant` is the reduced-motion path: no animation on either regime, in the
 * same call, so callers do not have to know which one is live.
 */
export function scrollToTop({ instant = false }: { instant?: boolean } = {}): void {
  if (active) {
    active.scrollTo(0, { immediate: instant });
    return;
  }
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: instant ? "auto" : "smooth" });
}
