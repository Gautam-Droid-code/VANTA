"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { BottomNavItem } from "@/data/types";
import { bottomNavIcons } from "@/components/ui/Icons";
import { useBag } from "@/components/BagProvider";
import { duration, ease, tapScale } from "@/lib/motion";
import { cn } from "@/lib/format";

interface BottomNavProps {
  items: BottomNavItem[];
}

const MotionLink = motion.create(Link);

/**
 * Mobile-only sticky bottom bar. `body` reserves its height (plus safe-area
 * inset) in globals.css, so it never covers the footer.
 */
export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();
  const { count, hydrated } = useBag();
  // See the note in Navbar: the bag is client-only, so the badge waits.
  const badgeCount = hydrated ? count : 0;

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-bone/10 bg-ink/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex h-[var(--bottom-nav-h)] items-stretch">
        {items.map((item) => {
          const Icon = bottomNavIcons[item.icon];
          const active = pathname === item.href;

          return (
            <li key={item.id} className="flex-1">
              <MotionLink
                href={item.href}
                whileTap={tapScale}
                transition={{ duration: duration.fast, ease: ease.inOut }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 transition-colors duration-200 ease-in-out",
                  active ? "text-bone" : "text-bone/50",
                )}
              >
                {/* Active indicator — shared layout animation slides it between
                    items rather than popping in and out. */}
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    transition={{ duration: duration.base, ease: ease.inOut }}
                    className="absolute inset-x-6 top-0 h-[2px] bg-bone"
                  />
                )}

                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.icon === "bag" && badgeCount > 0 && (
                    <span
                      aria-hidden
                      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-flare-red px-1 text-[10px] font-bold leading-none text-bone"
                    >
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                  {item.label}
                  {/* Keeps the accessible name starting with the visible label
                      ("Bag, 2 items") — WCAG 2.5.3 Label in Name.
                      One template string, not split expressions: Chrome's name
                      computation drops the whitespace between sibling text
                      nodes ("2ITEMS"). `normal-case` stops the parent's
                      uppercase leaking into the announced name. */}
                  {item.icon === "bag" && badgeCount > 0 && (
                    <span className="sr-only normal-case">
                      {`, ${badgeCount} ${badgeCount === 1 ? "item" : "items"}`}
                    </span>
                  )}
                </span>
              </MotionLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
