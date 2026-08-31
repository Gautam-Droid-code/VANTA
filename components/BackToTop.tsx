"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSyncExternalStore } from "react";
import { duration, ease } from "@/lib/motion";
import { scrollToTop } from "@/lib/scrollTo";
import { useScrollProgress } from "@/lib/useScrollProgress";
import { useScrolled } from "@/lib/useScrolled";

/**
 * Back to top, as a depth gauge rather than a floating chevron.
 *
 * The storefront's whole register is instrumentation — spec-sheet rows,
 * `tabular-nums`, uppercase micro-labels, a reference code on every product
 * page. A generic circular chevron would be the one control on the site that
 * came from somewhere else. So this reads the position it is offering to
 * change: the ring closes as the page is consumed, and the readout beside it
 * gives the number, the way an altimeter shows both a needle and a figure.
 *
 * That also makes it earn its place twice. Before you press it, it is telling
 * you how much is left — which is information the page did not otherwise
 * expose.
 *
 * `lib/useScrollProgress.ts` already existed and was unused; this is its first
 * consumer.
 */

/** Geometry for a 48px dial. `r` leaves room for the 2px stroke. */
const SIZE = 48;
const R = 20;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Roughly one viewport on a phone. Below this the control would be offering to
 * scroll somewhere the reader can already see, which is noise — and on a short
 * page it never appears at all, because `useScrollProgress` reports 0 for a
 * document that cannot scroll.
 */
const REVEAL_AFTER_PX = 600;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Subscribed to, not polled — the preference can change while the page is open. */
function subscribeToMotionPreference(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * `prefers-reduced-motion`, read live.
 *
 * `MotionConfig reducedMotion="user"` in `components/Providers.tsx` already
 * covers every Framer transition in the tree, so this control's entrance is
 * handled without asking. It cannot cover the **scroll**, which is not a
 * Framer animation at all — that decision has to be made here and handed to
 * `scrollToTop`. It also cannot cover the CSS transition on the progress arc.
 *
 * `useSyncExternalStore`, not state seeded by an effect — the same choice §21
 * records for the bag. A media query genuinely *is* an external store: it
 * lives outside React, it changes without React knowing, and the server can
 * only honestly answer "no preference".
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

export function BackToTop() {
  const progress = useScrollProgress();
  const visible = useScrolled(REVEAL_AFTER_PX);
  const reduced = usePrefersReducedMotion();

  const percent = Math.round(progress * 100);

  return (
    /**
     * `AnimatePresence` unmounts rather than fading to `opacity-0`. A control
     * that is invisible but still in the DOM is still in the tab order, so a
     * keyboard user at the top of the page would tab into a button they cannot
     * see and cannot use. Removing it is the only version that is honest to
     * both a mouse and a screen reader.
     */
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: duration.base, ease: ease.out }}
          /**
           * Clear of `BottomNav`, which is fixed to the bottom below `md` and
           * is `md:hidden`. Its height is the same `--bottom-nav-h` variable
           * the storefront shell already pads with, so the two cannot drift
           * apart — and `env(safe-area-inset-bottom)` keeps it off the home
           * indicator on a notched phone.
           *
           * `z-40` sits under the nav's `z-50` deliberately: they should not
           * overlap, and if a future layout change makes them, the navigation
           * is the one that must stay reachable.
           */
          className="fixed right-4 z-40 bottom-[calc(var(--bottom-nav-h)+1rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6"
        >
          <button
            type="button"
            onClick={() => scrollToTop({ instant: reduced })}
            aria-label="Back to top"
            className="group relative flex items-center gap-2 rounded-full outline-none"
          >
            {/*
              The readout. `aria-hidden` because the accessible name already
              says what the button does — a screen reader announcing "42% Back
              to top" would be reading the decoration as if it were the label.

              Hidden below `sm` and on hover-less pointers: it is a hover
              affordance, and on a phone it would either never appear or sit
              permanently over the content.
            */}
            <span
              aria-hidden
              className="pointer-events-none hidden rounded-full border border-bone/40 bg-ink-raised px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-bone opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block"
            >
              <span className="tabular-nums">{String(percent).padStart(2, "0")}</span>
              <span className="text-bone/70">%</span>
            </span>

            <span
              /**
               * `border-bone/40` is 3.58:1 against the page, so the control has
               * a boundary that meets WCAG 1.4.11 for non-text contrast. The
               * `ink-raised` fill alone is 1.13:1 against `ink` and would not —
               * measured, not guessed.
               */
              className="relative grid h-12 w-12 place-items-center rounded-full border border-bone/40 bg-ink-raised transition-colors duration-200 group-hover:bg-ink-line group-focus-visible:ring-2 group-focus-visible:ring-bone group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-ink"
            >
              {/*
                The dial. `-rotate-90` starts the arc at twelve o'clock, which
                is where a gauge reads from.
              */}
              <svg
                aria-hidden
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="absolute inset-0 h-full w-full -rotate-90"
              >
                {/*
                  Track. Decoration, and deliberately below 3:1 — WCAG 1.4.11
                  asks for contrast on what *identifies* the control and its
                  state, which here is the chevron (15.7:1) and the progress arc
                  (6.0:1). A track bright enough to pass would read as a full
                  ring and destroy the thing the arc is meant to show.
                */}
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-bone/15"
                />
                {/*
                  The arc. `flare-orange-hot` is 6.0:1 on this surface. It is
                  the only accent on the control, which is the restraint the
                  palette asks for — one signal colour, carrying the one piece
                  of live information.
                */}
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                  className={
                    // The arc tracks a value the reader is already moving. Under
                    // reduced motion it snaps instead, so nothing on the control
                    // is animating of its own accord.
                    reduced
                      ? "text-flare-orange-hot"
                      : "text-flare-orange-hot transition-[stroke-dashoffset] duration-150 ease-out"
                  }
                />
              </svg>

              {/* Chevron. 15.7:1 on this surface — the thing that says "up". */}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="relative h-4 w-4 text-bone transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5"
              >
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
