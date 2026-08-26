"use client";

import type { Backdrop } from "@/data/types";
import { backdropClass } from "@/lib/backdrops";
import { cn } from "@/lib/format";

/**
 * The four values of the `Backdrop` union in `data/types.ts` — the same named
 * moods used everywhere on the storefront. Swatches render the *real* gradients
 * via `backdropClass`, so what the editor shows is what the site paints.
 */
const OPTIONS: Array<{ value: Backdrop; label: string; hint: string }> = [
  { value: "red", label: "Red", hint: "Deep red" },
  { value: "orange", label: "Orange", hint: "Burnt orange" },
  { value: "sunset", label: "Sunset", hint: "Orange → red" },
  { value: "graphite", label: "Graphite", hint: "Near-black" },
];

export function BackdropPicker({
  value,
  onChange,
  idPrefix = "backdrop",
}: {
  value: Backdrop;
  onChange: (v: Backdrop) => void;
  idPrefix?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Backdrop" className="grid grid-cols-4 gap-2">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            id={`${idPrefix}-${opt.value}`}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "group rounded-lg border p-1.5 text-left transition-colors",
              active
                ? "border-admin-accent ring-2 ring-admin-accent/25"
                : "border-admin-border hover:border-admin-border-strong",
            )}
          >
            <span
              className={cn(
                "block h-12 w-full rounded-md",
                backdropClass[opt.value],
              )}
            />
            <span className="mt-1.5 block px-0.5 text-[11px] font-medium text-admin-ink">
              {opt.label}
            </span>
            <span className="block px-0.5 text-[10px] text-admin-subtle">{opt.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
