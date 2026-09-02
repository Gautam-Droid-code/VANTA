"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * The storefront's error boundary.
 *
 * There was none, so any unhandled runtime error inside a route rendered Next's
 * default error screen — in production that is an unstyled page reading
 * "Application error: a client-side exception has occurred", with no way back
 * into the site.
 *
 * Deliberately **self-contained**: no `Navbar`, no `Footer`, no content-store
 * read. This boundary catches errors thrown by the very components it would
 * otherwise render, and a boundary that depends on the thing that just failed
 * is a boundary that throws inside itself and escalates to the global one. The
 * markup below uses only Tailwind tokens and hard-coded links.
 *
 * `error.tsx` must be a Client Component — Next requires it, because `reset`
 * is a callback it hands to the browser.
 */
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /**
     * The only place the real error is available. In production Next strips the
     * message before it reaches the browser and leaves a `digest` — the hash
     * that matches this render to a line in the server log. Logging it is what
     * makes a user's "it broke" report traceable.
     */
    console.error("[storefront] unhandled error", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-gutter text-center">
      <p className="text-label font-bold uppercase tracking-[0.12em] text-bone-faint">
        Something went wrong
      </p>

      <h1 className="headline mt-3 max-w-xl text-display-sm text-bone">
        This page didn&rsquo;t load.
      </h1>

      <p className="mt-4 max-w-prose text-base leading-relaxed text-bone-dim">
        The fault is ours, not yours, and it has been logged. Trying again often
        works — the catalogue itself is fine.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-bone px-8 py-3.5 text-label-lg font-bold uppercase text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bone focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          Try again
        </button>
        <Link
          href="/products"
          className="text-label font-bold uppercase text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
        >
          All products
        </Link>
        <Link
          href="/"
          className="text-label font-bold uppercase text-bone-faint underline underline-offset-4 transition-colors hover:text-bone"
        >
          Home
        </Link>
      </div>

      {/*
        Shown, not hidden. A visitor reporting a fault can quote this and it
        matches a server log line exactly — far more useful than asking them to
        describe what they saw. It is a hash, not a stack trace: nothing about
        the failure leaks.
      */}
      {error.digest && (
        <p className="mt-10 font-mono text-[11px] tabular-nums text-bone-faint">
          Reference {error.digest}
        </p>
      )}
    </div>
  );
}
