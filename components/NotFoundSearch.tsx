"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { duration, ease } from "@/lib/motion";
import { cn } from "@/lib/format";

/**
 * The search box on the 404.
 *
 * A client leaf so the 404 itself stays a server component — the page's real
 * value is the server-rendered category list, and that must not depend on
 * hydration to appear.
 *
 * Navigates to `/search?q=…` rather than fetching inline. `/search` already
 * exists, already ranks results, and already handles the empty case; a second
 * search implementation here would be a second thing to keep correct.
 */
export function NotFoundSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: ease.out }}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = query.trim();
        // An empty search would land on `/search` with nothing to show, which
        // is a third dead end. Do nothing instead.
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
      className={cn("flex gap-2", className)}
    >
      <label htmlFor="not-found-search" className="sr-only">
        Search the catalogue
      </label>
      <input
        id="not-found-search"
        name="q"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for a piece, a category, a colour"
        // 16px minimum: anything smaller makes iOS Safari zoom on focus and
        // never zoom back out. Same rule as the account forms.
        className="min-w-0 flex-1 rounded-lg border border-bone/15 bg-ink-soft px-4 py-3 text-[16px] text-bone placeholder:text-bone-faint transition-colors focus:border-bone/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-bone focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
      />
      <button
        type="submit"
        disabled={query.trim().length === 0}
        className="shrink-0 rounded-lg border border-bone bg-bone px-5 text-label font-bold uppercase tracking-[0.12em] text-ink transition-opacity hover:opacity-80 disabled:opacity-40"
      >
        Search
      </button>
    </motion.form>
  );
}
