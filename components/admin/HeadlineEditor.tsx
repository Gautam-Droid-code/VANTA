"use client";

import type { HeadlineLine, HeadlineSegment } from "@/data/types";
import { Button, TextInput } from "./ui";
import { cn } from "@/lib/format";

/**
 * Edits `HeadlineLine[]` — a list of lines, each a list of segments, where
 * `accent: true` renders that segment in the italic serif.
 *
 * The nesting is real schema structure, not UI invention, so the editor exposes
 * it directly: add/remove lines, add/remove segments, toggle accent per segment.
 * Spacing is part of the segment text (e.g. `"MADE "`), which is why the inputs
 * don't trim.
 */
export function HeadlineEditor({
  value,
  onChange,
}: {
  value: HeadlineLine[];
  onChange: (next: HeadlineLine[]) => void;
}) {
  const update = (li: number, si: number, patch: Partial<HeadlineSegment>) => {
    const next = value.map((line, i) =>
      i !== li ? line : line.map((seg, j) => (j !== si ? seg : { ...seg, ...patch })),
    );
    onChange(next);
  };

  const addSegment = (li: number) =>
    onChange(value.map((line, i) => (i !== li ? line : [...line, { text: " new" }])));

  const removeSegment = (li: number, si: number) =>
    onChange(
      value.map((line, i) => (i !== li ? line : line.filter((_, j) => j !== si))).filter((l) => l.length),
    );

  const addLine = () => onChange([...value, [{ text: "NEW LINE" }]]);
  const removeLine = (li: number) => onChange(value.filter((_, i) => i !== li));

  return (
    <div className="space-y-3">
      {value.map((line, li) => (
        <div key={li} className="rounded-lg border border-admin-border bg-admin-surface-alt p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-admin-subtle">
              Line {li + 1}
            </span>
            {value.length > 1 && (
              <button
                type="button"
                onClick={() => removeLine(li)}
                className="text-[11px] font-medium text-admin-muted hover:text-admin-danger"
              >
                Remove line
              </button>
            )}
          </div>

          <div className="space-y-2">
            {line.map((seg, si) => (
              <div key={si} className="flex items-center gap-2">
                <TextInput
                  value={seg.text}
                  onChange={(e) => update(li, si, { text: e.target.value })}
                  aria-label={`Line ${li + 1} segment ${si + 1} text`}
                  className={cn("flex-1", seg.accent && "font-accent italic")}
                />

                <button
                  type="button"
                  onClick={() => update(li, si, { accent: !seg.accent })}
                  aria-pressed={Boolean(seg.accent)}
                  title="Render this part in the italic serif"
                  className={cn(
                    "shrink-0 rounded-lg border px-2.5 py-2 font-accent text-base italic leading-none transition-colors",
                    seg.accent
                      ? "border-admin-accent bg-admin-accent-soft text-admin-accent"
                      : "border-admin-border text-admin-subtle hover:border-admin-border-strong",
                  )}
                >
                  It
                </button>

                {line.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSegment(li, si)}
                    aria-label={`Remove segment ${si + 1}`}
                    className="shrink-0 rounded-lg px-2 py-2 text-admin-subtle transition-colors hover:text-admin-danger"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addSegment(li)}
            className="mt-2 text-[12px] font-medium text-admin-accent hover:underline"
          >
            + Add part
          </button>
        </div>
      ))}

      <Button type="button" onClick={addLine}>
        + Add line
      </Button>

      <p className="text-xs text-admin-muted">
        Each line breaks onto its own row. Use <strong>It</strong> to set a part
        in the italic serif. Spaces matter — keep the trailing space in
        &ldquo;MADE&nbsp;&rdquo; so words don&rsquo;t run together.
      </p>
    </div>
  );
}
