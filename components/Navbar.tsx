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
import { BagIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/ui/Icons";
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
        <nav
          aria-label="Primary"
          /**
           * Wordmark left, not centred.
           *
           * A centred wordmark splits the bar into two fixed halves and caps
           * the menu at roughly five links — the list had started scrolling out
           * of sight. Anchoring it left hands the whole middle to the links,
           * which is also the arrangement people scan fastest: brand, then
           * where to go, then what they are carrying.
           */
          className="mx-auto flex h-[var(--nav-h)] max-w-container items-center gap-4 px-gutter lg:h-16 lg:gap-8 lg:px-gutter-lg"
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

          {/* The list is editor-controlled and unbounded, so it still degrades
              by scrolling rather than breaking the bar — there is just far more
              room before that happens now. */}
          <ul className="hidden min-w-0 flex-1 items-center gap-6 overflow-x-auto lg:flex xl:gap-8 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
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
                    {/* Marks the page you are on and the one you are pointing
                        at with the same rule, in the accent that means
                        "active" everywhere else on the site. */}
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

          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
            <motion.button
              type="button"
              whileTap={tapScale}
              className="p-2 text-bone transition-opacity duration-200 ease-in-out hover:opacity-70"
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
