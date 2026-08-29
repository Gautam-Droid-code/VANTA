"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId } from "react";
import { SORT_OPTIONS, type SortValue } from "@/lib/productSort";

/**
 * The sort control.
 *
 * A real `<form method="get">` wrapping a `<select>`, with the change handler
 * only upgrading it to a client-side navigation. Without JavaScript the select
 * still submits and the page still sorts — the same rule the navbar's search
 * follows.
 *
 * The sort lives in the URL rather than in component state so that a sorted
 * grid can be linked, bookmarked and reloaded. State would make the back
 * button do nothing after changing it, which is the usual complaint about
 * controls like this.
 */
export function SortSelect({ value }: { value: SortValue }) {
  const router = useRouter();
  const params = useSearchParams();
  const id = useId();

  return (
    <form method="get" className="flex items-center gap-2">
      {/*
        Any other query parameter in the URL is carried through as a hidden
        field. Without this, submitting the form would drop everything except
        `sort` — a filter applied elsewhere would vanish the moment someone
        changed the ordering.
      */}
      {[...params.entries()]
        .filter(([key]) => key !== "sort")
        .map(([key, entry]) => (
          <input key={`${key}-${entry}`} type="hidden" name={key} value={entry} />
        ))}

      <label htmlFor={id} className="eyebrow whitespace-nowrap">
        Sort
      </label>
      <select
        id={id}
        name="sort"
        defaultValue={value}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          next.set("sort", event.target.value);
          // `scroll: false` — changing the order should not throw the reader
          // back to the top of a grid they were partway down.
          router.push(`?${next.toString()}`, { scroll: false });
        }}
        className="border border-ink-line bg-transparent px-3 py-1.5 text-sm text-bone transition-colors hover:border-bone/40 focus:border-bone/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-bone/20"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-ink text-bone">
            {option.label}
          </option>
        ))}
      </select>

      {/* Only ever seen without JavaScript, where the change handler cannot run. */}
      <noscript>
        <button
          type="submit"
          className="border border-ink-line px-3 py-1.5 text-label font-bold uppercase text-bone"
        >
          Apply
        </button>
      </noscript>
    </form>
  );
}
