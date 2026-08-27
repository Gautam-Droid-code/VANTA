"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { NavContent } from "@/data/types";
import { useScrolled } from "@/lib/useScrolled";
import { useScrollProgress } from "@/lib/useScrollProgress";
import { useBag } from "@/components/BagProvider";
import { duration, ease, stagger, tapScale } from "@/lib/motion";
import { BagIcon, CloseIcon, GridIcon, MenuIcon, SearchIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/format";

interface NavbarProps {
  nav: NavContent;
}

export function Navbar({ nav }: NavbarProps) {
  const scrolled = useScrolled(8);
  const progress = useScrollProgress();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useBag();

  /**
   * A link is current if the path matches it, or sits beneath it — so
   * `/collections/new` marks "New Drops" rather than only an exact hit. "/" is
   * excluded from the prefix rule, or every route would match it.
   */
  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter] duration-300 ease-in-out",
          scrolled || menuOpen ? "bg-ink/80 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        {/*
          Two rows, following the brief's reference.

          Row one is the shop's fixed furniture — who you are, what you are
          looking for, what you are carrying. Row two is the catalogue, which is
          editor-controlled and changes. Splitting them means the link list gets
          a full-width row of its own, so the count that fits stopped being a
          design constraint at all.

          Deliberately NOT carrying the reference's account chip: this storefront
          has no accounts, and a signed-in avatar would be inventing a feature.
        */}
        <nav
          aria-label="Primary"
          className="mx-auto flex h-[var(--nav-h)] max-w-container items-center gap-3 px-gutter lg:gap-5 lg:px-gutter-lg"
        >
          <motion.button
            type="button"
            onClick={() => setMenuOpen(true)}
            whileTap={tapScale}
            className="-ml-2 shrink-0 p-2 text-bone lg:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <MenuIcon className="h-5 w-5" />
          </motion.button>

          <Link
            href="/"
            className="shrink-0 whitespace-nowrap font-display text-lg font-black uppercase leading-none tracking-[0.28em] text-bone lg:text-xl"
          >
            {nav.wordmark}
          </Link>

          {/*
            A real field rather than the icon-only button that was here, because
            search is how people shop a catalogue. The placeholder says "coming
            soon" because it is: there is no search route yet, and a box that
            silently swallows a query is worse than one that admits it. Same
            wording the admin already uses, so the two surfaces agree.
          */}
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="relative ml-auto hidden min-w-0 flex-1 sm:block lg:ml-0"
          >
            <label htmlFor="site-search" className="sr-only">
              Search
            </label>
            <input
              id="site-search"
              type="search"
              placeholder="Search — coming soon"
              className="h-9 w-full rounded-full border border-bone/15 bg-bone/[0.06] pl-4 pr-10 text-sm text-bone placeholder:text-bone/40 transition-colors duration-200 focus:border-bone/30 focus:bg-bone/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-bone/20"
            />
            <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bone/50" />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
            {/* Phones don't get the field — it would crowd out the wordmark —
                so the icon stays as the way in on small screens. */}
            <motion.button
              type="button"
              whileTap={tapScale}
              className="p-2 text-bone transition-opacity duration-200 ease-in-out hover:opacity-70 sm:hidden"
              aria-label="Search"
            >
              <SearchIcon className="h-5 w-5" />
            </motion.button>

            <Link
              href="/bag"
              className="relative -mr-2 p-2 text-bone transition-opacity duration-200 ease-in-out hover:opacity-70"
              aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <BagIcon className="h-5 w-5" />
              {count > 0 && (
                <span
                  key={count}
                  aria-hidden
                  className="absolute right-0 top-0 flex h-4 min-w-4 animate-badge-pop items-center justify-center rounded-full bg-flare-red px-1 text-[10px] font-bold leading-none text-bone"
                >
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          </div>
        </nav>

        {/* Row two — the catalogue. Hidden on phones, where the same links are
            already the whole of the slide-out menu. */}
        <div className="hidden border-t border-bone/10 lg:block">
          <div className="mx-auto flex h-[var(--nav-row2-h)] max-w-container items-center gap-6 px-gutter-lg">
            <Link
              href="/collections"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap text-label font-bold uppercase text-bone/70 transition-colors duration-200 hover:text-bone"
            >
              <GridIcon className="h-3.5 w-3.5" />
              All categories
            </Link>

            <span aria-hidden className="h-4 w-px shrink-0 bg-bone/15" />

            <ul className="flex min-w-0 flex-1 items-center justify-between gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {nav.links.map((link) => {
                const current = isCurrent(link.href);
                return (
                  <li key={link.href} className="flex-none">
                    <Link
                      href={link.href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "group relative block whitespace-nowrap py-1 text-label font-bold uppercase transition-colors duration-200 ease-in-out",
                        current ? "text-bone" : "text-bone/60 hover:text-bone",
                      )}
                    >
                      {link.label}
                      <span
                        className={cn(
                          "absolute -bottom-0.5 left-0 h-px bg-flare-red transition-[width] duration-300 ease-in-out",
                          current ? "w-full" : "w-0 group-hover:w-full",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/*
          Reading position, as an instrument rather than an ornament. The page
          is one long scroll-driven sequence, so how far through it you are is
          real information — and this is the same accent the site uses for
          "live" everywhere else. `scaleX` on a fixed-width rail so the browser
          animates a transform rather than re-laying out on every frame.
        */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-bone/10">
          <div
            className="h-full origin-left bg-flare-red"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      </header>

      {/* Mobile menu sheet */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base, ease: ease.out }}
            className="fixed inset-0 z-[60] bg-ink lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex h-[var(--nav-h)] items-center justify-end px-gutter">
              <motion.button
                type="button"
                onClick={() => setMenuOpen(false)}
                whileTap={tapScale}
                className="-mr-2 p-2 text-bone"
                aria-label="Close menu"
              >
                <CloseIcon className="h-5 w-5" />
              </motion.button>
            </div>

            <motion.ul
              initial="hidden"
              animate="visible"
              variants={stagger(0.05, 0.08)}
              className="flex flex-col px-gutter pt-6"
            >
              {nav.links.map((link) => (
                <motion.li
                  key={link.href}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: duration.base, ease: ease.out },
                    },
                  }}
                  className="border-b border-bone/10"
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="headline block py-5 text-4xl text-bone"
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
