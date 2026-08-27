"use client";

import { motion } from "framer-motion";
import { useWishlist } from "@/components/WishlistProvider";
import { HeartIcon } from "@/components/ui/Icons";
import { duration, ease, tapScale } from "@/lib/motion";
import { cn } from "@/lib/format";

/**
 * Saves a product to the wishlist, or unsaves it.
 *
 * One control with two states rather than separate save and remove actions:
 * the heart already means "saved" everywhere, and a filled one is how someone
 * checks whether they have saved something without leaving the page.
 *
 * `overlay` is the version that sits on a product card's photograph; the
 * default is the inline one used beside a product page's Add to bag.
 */
export function SaveButton({
  productId,
  productName,
  overlay = false,
}: {
  productId: string;
  productName: string;
  overlay?: boolean;
}) {
  const { has, toggle, hydrated } = useWishlist();
  const saved = hydrated && has(productId);

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        /**
         * On a card this button sits inside the link to the product, so
         * without this a save would also navigate away from the page the
         * shopper is browsing.
         */
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      disabled={!hydrated}
      whileTap={hydrated ? tapScale : undefined}
      transition={{ duration: duration.fast, ease: ease.inOut }}
      aria-pressed={saved}
      /* The accessible name carries the product, because on a listing page
         there are a dozen of these and "Save" alone identifies none of them. */
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      className={cn(
        "transition-colors duration-200 ease-in-out disabled:cursor-not-allowed",
        overlay
          ? "absolute right-2 top-2 z-10 rounded-full bg-ink/50 p-2 backdrop-blur-sm hover:bg-ink/70"
          : "inline-flex items-center gap-2 rounded-full border border-bone/30 px-6 py-4 text-label-lg font-bold uppercase hover:border-bone",
        saved ? "text-flare-red" : "text-bone/70 hover:text-bone",
      )}
    >
      <HeartIcon
        className={cn(overlay ? "h-4 w-4" : "h-4 w-4")}
        /* Filled when saved: the outline/fill difference is what makes the
           state readable at a glance, without relying on colour alone. */
        fill={saved ? "currentColor" : "none"}
      />
      {!overlay && <span>{saved ? "Saved" : "Save"}</span>}
    </motion.button>
  );
}
