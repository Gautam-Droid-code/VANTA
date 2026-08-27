"use client";

import { MotionConfig } from "framer-motion";
import { BagProvider } from "@/components/BagProvider";
import { WishlistProvider } from "@/components/WishlistProvider";

/**
 * `reducedMotion="user"` makes every Framer Motion animation in the tree
 * respect prefers-reduced-motion without per-component checks.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <BagProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </BagProvider>
    </MotionConfig>
  );
}
