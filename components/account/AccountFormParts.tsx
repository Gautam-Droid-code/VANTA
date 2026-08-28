"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/format";

/**
 * Form primitives for the storefront's account pages.
 *
 * Separate from `components/admin/ui` on purpose, and not a candidate for
 * merging with it. The admin runs a light workspace on `admin-*` tokens; this
 * is bone-on-ink storefront chrome. They look nothing alike, they are edited by
 * different people for different reasons, and a shared component would have to
 * carry both palettes to serve either.
 */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-label font-bold uppercase tracking-[0.12em] text-bone/50"
      >
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs text-bone/35">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-xs text-flare-orange">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      // Points the field at its own message, so a screen reader reads the error
      // when focus lands rather than only when the eye reaches it.
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${props.id}-error` : props["aria-describedby"]}
      className={cn(
        "w-full rounded-lg border bg-ink-soft px-3.5 py-3 text-base text-bone",
        "placeholder:text-bone/25",
        // 16px minimum on mobile. Anything smaller makes iOS Safari zoom the
        // viewport on focus and never zoom back out.
        "text-[16px]",
        "transition-colors duration-150",
        invalid
          ? "border-flare-orange/60 focus:border-flare-orange"
          : "border-bone/15 focus:border-bone/50",
        "focus:outline-none",
        className,
      )}
    />
  );
}

/**
 * Submit button that knows whether its own form is in flight.
 *
 * `useFormStatus` reads the enclosing form, which is why this is a component
 * rather than a prop threaded down from the page — the pending state belongs
 * to the form, and nothing above it has to know about it.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex w-full items-center justify-center rounded-full bg-bone px-8 py-4",
        "text-label-lg font-bold uppercase text-ink",
        "transition-colors duration-200 hover:bg-white",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** The error that is about the submission rather than about one field. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-flare-orange/30 bg-flare-orange/10 px-3.5 py-3 text-sm text-bone"
    >
      {message}
    </p>
  );
}

export function FormNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="status" className="text-sm text-bone/60">
      {message}
    </p>
  );
}
