"use client";

import { useCallback, useState, useSyncExternalStore, useTransition } from "react";
import { checkPincode, type PincodeAnswer } from "@/app/actions/pincode";
import { cn } from "@/lib/format";

/**
 * "Check delivery" — a pincode box on the product page and in the bag.
 *
 * Answers the two questions that decide whether someone adds to bag at all:
 * does it reach me, and by when. Asking Shiprocket at checkout instead would
 * mean discovering an undeliverable address after the address has been typed.
 *
 * The pincode is remembered in `localStorage` so it is typed once and the bag
 * already knows it. That is a convenience, not state — nothing depends on it
 * being there, and the server re-checks every time regardless.
 */

const STORAGE_KEY = "vanta.pincode";

function remembered(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // Private browsing, or storage disabled entirely. The feature works
    // without it; only the convenience is lost.
    return "";
  }
}

/**
 * Nothing outside this component changes the stored pincode, so there is
 * nothing to subscribe to. `useSyncExternalStore` still wants a subscribe
 * function, and a stable no-op is the honest one — inventing a `storage` event
 * listener would imply a cross-tab behaviour that does not exist here.
 */
const noopSubscribe = () => () => {};

export function PincodeCheck({
  /** Order value in rupees, when known — improves their rate estimate. */
  valueRupees,
  className,
}: {
  valueRupees?: number;
  className?: string;
}) {
  /**
   * The remembered pincode, read through `useSyncExternalStore`.
   *
   * `localStorage` does not exist on the server, so reading it during render
   * would make the first client render disagree with the server's and
   * hydration would fail. This hook is the sanctioned way to read a
   * browser-only source: the server snapshot is empty, the client snapshot is
   * whatever was stored, and React reconciles the two after hydration instead
   * of an effect that sets state and causes a second render.
   */
  const stored = useSyncExternalStore(noopSubscribe, remembered, () => "");

  /** Null until the field is touched, at which point typing wins over storage. */
  const [typed, setTyped] = useState<string | null>(null);
  const pincode = typed ?? stored;

  const [answer, setAnswer] = useState<PincodeAnswer | null>(null);
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    (value: string) => {
      startTransition(async () => {
        const result = await checkPincode(value, { valueRupees });
        setAnswer(result);
        if (result.status === "serviceable" || result.status === "not-serviceable") {
          try {
            window.localStorage.setItem(STORAGE_KEY, value);
          } catch {
            // See `remembered`.
          }
        }
      });
    },
    [valueRupees],
  );

  return (
    <div className={cn("border border-ink-line px-4 py-4", className)}>
      <p className="text-label font-bold uppercase tracking-[0.12em] text-bone/50">
        Check delivery
      </p>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(pincode);
        }}
      >
        <label htmlFor="pincode-check" className="sr-only">
          Delivery pincode
        </label>
        <input
          id="pincode-check"
          name="pincode"
          value={pincode}
          onChange={(event) => {
            // Digits only, six of them. Cheaper than an error message.
            setTyped(event.target.value.replace(/\D/g, "").slice(0, 6));
            setAnswer(null);
          }}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="Pincode"
          className="min-w-0 flex-1 rounded-lg border border-bone/15 bg-ink-soft px-3.5 py-2.5 text-[16px] text-bone placeholder:text-bone/25 transition-colors focus:border-bone/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || pincode.length !== 6}
          className="shrink-0 rounded-lg border border-bone/30 px-4 text-label font-bold uppercase tracking-[0.12em] text-bone transition-colors hover:border-bone disabled:opacity-40"
        >
          {pending ? "…" : "Check"}
        </button>
      </form>

      {answer && (
        // `polite`, so it is announced when the result lands without cutting
        // off whatever a screen reader is already saying.
        <div aria-live="polite" className="mt-3 text-sm leading-relaxed">
          {answer.status === "serviceable" ? (
            <>
              <p className="text-bone">{answer.eta ?? "Delivers to this pincode."}</p>
              <p className="mt-1 text-xs text-bone/40">
                {answer.courier ? `via ${answer.courier}` : "Deliverable"}
                {answer.codAvailable === false ? " · prepaid only" : ""}
              </p>
            </>
          ) : (
            <p
              className={cn(
                answer.status === "not-serviceable" ? "text-flare-orange" : "text-bone/50",
              )}
            >
              {answer.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
