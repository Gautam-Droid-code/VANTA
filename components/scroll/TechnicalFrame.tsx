import { cn } from "@/lib/format";

/**
 * Blueprint furniture: corner crosshairs and a faint measurement rule.
 *
 * Pure CSS/SVG, no JS, no motion — it's texture, not animation, so it renders
 * on the server and costs nothing at runtime. Kept at very low opacity: the
 * point is that you notice it on the second look, not the first.
 */
export function TechnicalFrame({
  label,
  className,
}: {
  /** Optional spec-sheet caption, e.g. "FIG. 02 — SERIES 026". */
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {/* Corner crosshairs */}
      {[
        "left-gutter top-8 lg:left-gutter-lg",
        "right-gutter top-8 lg:right-gutter-lg",
        "left-gutter bottom-8 lg:left-gutter-lg",
        "right-gutter bottom-8 lg:right-gutter-lg",
      ].map((pos) => (
        <span key={pos} className={cn("absolute", pos)}>
          <svg width="11" height="11" viewBox="0 0 11 11" className="text-bone/20">
            <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
          </svg>
        </span>
      ))}

      {/* Measurement rule down the right edge */}
      <span className="absolute right-gutter top-1/2 hidden -translate-y-1/2 lg:right-[calc(theme(spacing.gutter-lg)+2px)] lg:block">
        <svg width="6" height="120" viewBox="0 0 6 120" className="text-bone/15">
          {Array.from({ length: 13 }).map((_, i) => (
            <path
              key={i}
              d={`M0 ${i * 10} H${i % 5 === 0 ? 6 : 3}`}
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
        </svg>
      </span>

      {label && (
        <span className="absolute bottom-8 left-1/2 -translate-x-1/2 font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-bone/20">
          {label}
        </span>
      )}
    </div>
  );
}
