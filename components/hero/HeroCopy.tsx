"use client";

import { motion } from "framer-motion";
import { duration, ease } from "@/lib/motion";

/**
 * Client leaf: the description + CTA fade up on load, timed to land just after
 * the headline lines finish. Its children are server-rendered and passed
 * through — only this wrapper hydrates.
 */
export function HeroCopy({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.slow, ease: ease.out, delay: 0.55 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
