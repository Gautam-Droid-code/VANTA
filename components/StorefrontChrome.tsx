"use client";

import { usePathname } from "next/navigation";
import { BackToTop } from "@/components/BackToTop";

/**
 * The chrome every storefront page gets and no storefront page asks for.
 *
 * Mounted once in the root layout, so a new route inherits it by existing
 * rather than by remembering to paste two components in — which is the failure
 * mode that left `<main id="main">` on every page with nothing linking to it
 * for the whole life of the project.
 *
 * ## Why a pathname check rather than a route group
 *
 * The admin must not have either of these. It has its own visual system
 * (`admin-*` tokens, §14), its own skip target — and a floating control there
 * would land on top of the drawers and the sticky form footers.
 *
 * The textbook answer is an `app/(storefront)` route group with its own layout.
 * That would mean moving nine top-level route directories to buy a check this
 * component can do in one line, and every one of those moves is a chance to
 * break a static path or an import. The pathname test is honest about what it
 * is: one boundary, in one file, named after the thing it excludes.
 */
export function StorefrontChrome() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/*
        Skip link. Every storefront page already renders `<main id="main">` —
        the target has been there all along and nothing pointed at it, so a
        keyboard user had to tab the entire navbar, the search field and the
        category row on every single navigation.

        Visually hidden until focused, and then a real, opaque, high-contrast
        panel rather than a faint outline: it is the first thing a keyboard user
        meets, and it is the one moment where being unmissable matters more than
        being quiet.
      */}
      <a
        href="#main"
        className="fixed left-4 top-4 z-[100] -translate-y-[200%] rounded-lg border border-bone/40 bg-ink px-4 py-2 text-label font-bold uppercase tracking-[0.12em] text-bone transition-transform duration-150 focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bone focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
      >
        Skip to content
      </a>

      <BackToTop />
    </>
  );
}
