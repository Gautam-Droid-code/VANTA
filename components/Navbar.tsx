"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { NavContent } from "@/data/types";
import { useScrolled } from "@/lib/useScrolled";
import { useBag } from "@/components/BagProvider";
import { duration, ease, stagger, tapScale } from "@/lib/motion";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/format";

interface NavbarProps {
  nav: NavContent;
}

export function Navbar({ nav }: NavbarProps) {
  const scrolled = useScrolled(8);
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useBag();

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
          "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300 ease-in-out",
          scrolled || menuOpen
            ? "border-b border-bone/10 bg-ink/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <nav
          aria-label="Primary"
          className="mx-auto grid h-[var(--nav-h)] max-w-container grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-gutter lg:h-16 lg:px-gutter-lg"
        >
          {/* Left: hamburger (mobile) / links (desktop) */}
          {/* `min-w-0`: a grid track sized `1fr` still refuses to shrink below
              its content, so a long link list pushed the centred wordmark off
              centre instead of staying inside its own column. */}
          <div className="flex min-w-0 items-center justify-start">
            <motion.button
              type="button"
              onClick={() => setMenuOpen(true)}
              whileTap={tapScale}
              className="-ml-2 p-2 text-bone lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <MenuIcon className="h-5 w-5" />
            </motion.button>

            {/* The link list is editor-controlled and unbounded, so it has to
                degrade rather than break the bar. It scrolls if it outgrows its
                column; `flex-none` on the items stops them being squeezed. */}
            <ul className="hidden min-w-0 items-center gap-5 overflow-x-auto lg:flex xl:gap-7 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {nav.links.map((link) => (
                <li key={link.href} className="flex-none">
                  <Link
                    href={link.href}
                    /* `whitespace-nowrap`: without it a two-word label like
                       "New Drops" breaks across two lines and the whole bar
                       grows to fit it. */
                    className="group relative whitespace-nowrap text-label font-bold uppercase text-bone/70 transition-colors duration-200 ease-in-out hover:text-bone"
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 h-px w-0 bg-bone transition-[width] duration-300 ease-in-out group-hover:w-full" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Center: wordmark — single line, never wraps */}
          <Link
            href="/"
            className="whitespace-nowrap font-display text-lg font-black uppercase leading-none tracking-[0.32em] text-bone lg:text-xl"
            style={{ letterSpacing: "0.3em", paddingLeft: "0.3em" }}
          >
            {nav.wordmark}
          </Link>

          {/* Right: search + bag */}
          <div className="flex items-center justify-end gap-1">
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
