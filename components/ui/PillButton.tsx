"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { duration, ease, tapScale } from "@/lib/motion";
import { cn } from "@/lib/format";

const MotionLink = motion.create(Link);

interface PillButtonProps {
  href: string;
  children: React.ReactNode;
  /** Full-width on mobile, inline from `sm` up — the homepage CTA default. */
  block?: boolean;
  variant?: "solid" | "ghost";
  className?: string;
}

/**
 * Off-white pill, black bold label, no shadow.
 * Scales down slightly on press for tactile feedback.
 */
export function PillButton({
  href,
  children,
  block = false,
  variant = "solid",
  className,
}: PillButtonProps) {
  return (
    <MotionLink
      href={href}
      whileTap={tapScale}
      transition={{ duration: duration.fast, ease: ease.inOut }}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-8 py-4 text-label-lg font-bold uppercase",
        "transition-colors duration-200 ease-in-out",
        variant === "solid"
          ? "bg-bone text-ink hover:bg-white"
          : "border border-bone/30 text-bone hover:border-bone hover:bg-bone hover:text-ink",
        block ? "w-full sm:w-auto" : "w-auto",
        className,
      )}
    >
      {children}
    </MotionLink>
  );
}
