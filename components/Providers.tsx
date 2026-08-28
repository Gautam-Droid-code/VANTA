"use client";

import { MotionConfig } from "framer-motion";
import { BagProvider } from "@/components/BagProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { AccountSync } from "@/components/AccountSync";

/**
 * `reducedMotion="user"` makes every Framer Motion animation in the tree
 * respect prefers-reduced-motion without per-component checks.
 *
 * `AccountSync` is mounted only when somebody is signed in. It is the piece
 * that mirrors the bag and wishlist to their account, and for a guest there is
 * nothing to mirror — so a guest never pays for the listener or the request.
 */
export function Providers({
  children,
  signedIn = false,
}: {
  children: React.ReactNode;
  signedIn?: boolean;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <BagProvider>
        <WishlistProvider>
          {signedIn && <AccountSync />}
          {children}
        </WishlistProvider>
      </BagProvider>
    </MotionConfig>
  );
}
