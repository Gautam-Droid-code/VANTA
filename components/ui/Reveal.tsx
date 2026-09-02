"use client";

import { motion, type Variants } from "framer-motion";
import { fadeUp, inView, stagger } from "@/lib/motion";
import { cn } from "@/lib/format";

/**
 * Client leaves for scroll-reveal animation.
 *
 * These exist so that *sections* can stay server components: a server section
 * renders its markup and passes it as `children` into one of these wrappers.
 * Only the wrapper hydrates. See DECISIONS.md §13 — "animate the leaf, not the
 * section".
 */

type Element =
  | "div"
  | "section"
  | "li"
  | "ul"
  | "header"
  | "article"
  | "p"
  | "span"
  | "h2"
  | "h3";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  as?: Element;
  delay?: number;
}

/** Standalone fade-up on scroll-into-view. Declares its own trigger. */
export function Reveal({
  children,
  className,
  variants = fadeUp,
  as = "div",
  delay = 0,
}: RevealProps) {
  const Component = motion[as];
  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={inView}
      variants={variants}
      transition={delay ? { delay } : undefined}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}

interface RevealGroupProps {
  children: React.ReactNode;
  className?: string;
  staggerChildren?: number;
  delayChildren?: number;
  as?: Element;
}

/**
 * Staggers `RevealItem` descendants. Owns the scroll trigger; children inherit
 * the `hidden` → `visible` transition through Framer's variant propagation.
 */
export function RevealGroup({
  children,
  className,
  staggerChildren = 0.07,
  delayChildren = 0,
  as = "div",
}: RevealGroupProps) {
  const Component = motion[as];
  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={inView}
      variants={stagger(staggerChildren, delayChildren)}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}

interface RevealItemProps {
  children: React.ReactNode;
  className?: string;
  /** `fadeUp` for standalone-sized items, `fadeUpSm` inside a copy stack. */
  variants?: Variants;
  as?: Element;
}

/**
 * A child of `RevealGroup`. Deliberately declares no `initial`/`whileInView` —
 * it inherits the parent group's animation state, which is what makes the
 * stagger work. Using it outside a group renders it statically visible.
 */
export function RevealItem({
  children,
  className,
  variants = fadeUp,
  as = "div",
}: RevealItemProps) {
  const Component = motion[as];
  return (
    <Component variants={variants} className={cn(className)}>
      {children}
    </Component>
  );
}
