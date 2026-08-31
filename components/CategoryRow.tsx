"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { CountedCategory } from "@/lib/catalogue";
import { duration, ease } from "@/lib/motion";
import { ArrowRightIcon } from "@/components/ui/Icons";

interface CategoryRowProps {
  /**
   * Carries a `count` derived from the catalogue, not a stored `itemCount`.
   * The old field disagreed with every collection page it linked to. §30.
   */
  category: CountedCategory;
}

const MotionLink = motion.create(Link);

/**
 * Stays a client component: the row *is* the interaction. The thumbnail
 * crossfade, label offset, and arrow offset are all children reading the row's
 * `active` variant, so `whileHover` / `whileFocus` / `whileTap` cover mouse,
 * keyboard, and touch through one mechanism (DECISIONS.md §8).
 *
 * The `<li>` wrapper and scroll stagger live in the server `CategoryList`.
 */
export function CategoryRow({ category }: CategoryRowProps) {
  return (
    <MotionLink
      href={category.href}
      initial="rest"
      animate="rest"
      whileHover="active"
      whileFocus="active"
      whileTap="active"
      className="group relative flex items-center justify-between gap-6 overflow-hidden px-gutter py-7 lg:px-gutter-lg lg:py-10"
    >
      {/* Backdrop thumbnail — crossfades, never hard-swaps */}
      <motion.span
        aria-hidden
        variants={{ rest: { opacity: 0 }, active: { opacity: 0.38 } }}
        transition={{ duration: duration.slow, ease: ease.inOut }}
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <Image
          src={category.image.src}
          alt=""
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Keeps the label readable over whatever the photo is doing */}
        <span className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/30" />
      </motion.span>

      <motion.span
        variants={{ rest: { x: 0 }, active: { x: 10 } }}
        transition={{ duration: duration.base, ease: ease.inOut }}
        className="headline whitespace-nowrap text-3xl text-bone lg:text-5xl"
      >
        {category.name}
      </motion.span>

      <span className="flex shrink-0 items-center gap-4">
        {/*
          `bone-faint` rather than `bone/40`. The token is the one described in
          `tailwind.config.ts` as being for labels and meta, and at 6.12:1 on
          `ink` it passes AA — where `bone/40` is 3.58:1 and does not. Measured
          while replacing the number this line renders.
        */}
        <span className="hidden text-label font-bold uppercase text-bone-faint sm:inline">
          {category.count} {category.count === 1 ? "item" : "items"}
        </span>
        <motion.span
          variants={{ rest: { x: 0 }, active: { x: 6 } }}
          transition={{ duration: duration.base, ease: ease.inOut }}
          className="text-bone"
        >
          <ArrowRightIcon className="h-5 w-5 lg:h-6 lg:w-6" />
        </motion.span>
      </span>
    </MotionLink>
  );
}
