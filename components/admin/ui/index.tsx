"use client";

import { cn } from "@/lib/format";

/** Shared admin form + surface primitives. Inter throughout; Archivo only on headings. */

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  return (
    <Tag
      className={cn(
        "rounded-xl border border-admin-border bg-admin-surface",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border-b border-admin-border px-5 py-4">
      <h2 className="font-admin-display text-sm font-semibold tracking-tight text-admin-ink">
        {title}
      </h2>
      {hint && <p className="mt-0.5 text-xs text-admin-muted">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  note,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  /** Small pill to the right of the label, e.g. "Not yet active". */
  note?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium text-admin-ink"
        >
          {label}
        </label>
        {note && (
          <span className="rounded border border-admin-border bg-admin-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-admin-subtle">
            {note}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="mt-1.5 text-xs text-admin-muted">{hint}</p>}
    </div>
  );
}

const inputBase =
  "w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-ink placeholder:text-admin-subtle transition-colors focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/25 disabled:cursor-not-allowed disabled:bg-admin-bg disabled:text-admin-muted";

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, className)} />;
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, "resize-y", className)} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputBase, "cursor-pointer", className)}>
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-left transition-colors hover:border-admin-border-strong"
    >
      <span>
        <span className="block text-[13px] font-medium text-admin-ink">{label}</span>
        {hint && <span className="block text-xs text-admin-muted">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-admin-accent" : "bg-admin-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-admin-accent text-white hover:bg-admin-accent-hover",
    secondary:
      "border border-admin-border bg-admin-surface text-admin-ink hover:border-admin-border-strong",
    ghost: "text-admin-muted hover:bg-admin-bg hover:text-admin-ink",
    danger: "border border-admin-danger/30 text-admin-danger hover:bg-admin-danger/5",
  };
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        styles[variant],
        className,
      )}
    />
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "muted";
}) {
  const tones = {
    neutral: "border-admin-border bg-admin-bg text-admin-muted",
    accent: "border-admin-accent/30 bg-admin-accent-soft text-admin-accent",
    // Outline-only variant for "off" states. Uses `admin-muted`, not
    // `admin-subtle` — subtle on white is ~2.9:1 and fails as text.
    muted: "border-admin-border bg-transparent text-admin-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
