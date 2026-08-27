"use client";

import type { Link as LinkType } from "@/data/types";
import { checkHref } from "@/lib/linkHref";
import { Field, TextInput, Toggle } from "./ui";
import { AddButton, ReorderRow, moveItem } from "./ReorderableList";

/**
 * Edits a `Link[]` — used by both Navigation and the Footer.
 *
 * `Link` carries an optional `external` flag, which the storefront uses to add
 * `target="_blank" rel="noopener noreferrer"`. It's exposed here because the
 * WhatsApp support link depends on it.
 */
export function LinkListEditor({
  value,
  onChange,
  addLabel = "+ Add link",
  hrefHint,
}: {
  value: LinkType[];
  onChange: (next: LinkType[]) => void;
  addLabel?: string;
  hrefHint?: string;
}) {
  const patch = (i: number, p: Partial<LinkType>) =>
    onChange(value.map((l, j) => (j === i ? { ...l, ...p } : l)));

  return (
    <div>
      <ul className="space-y-2">
        {value.map((link, i) => {
          const problem = checkHref(link.href, link.external);
          return (
          <ReorderRow
            key={i}
            index={i}
            total={value.length}
            title={link.label || "Untitled link"}
            subtitle={link.href}
            onMove={(from, to) => onChange(moveItem(value, from, to))}
            onRemove={(idx) => onChange(value.filter((_, j) => j !== idx))}
          >
            <div className="space-y-3">
              <Field label="Text" htmlFor={`link-label-${i}`}>
                <TextInput
                  id={`link-label-${i}`}
                  value={link.label}
                  onChange={(e) => patch(i, { label: e.target.value })}
                />
              </Field>

              <Field
                label="Link"
                htmlFor={`link-href-${i}`}
                note={link.external ? undefined : "Coming soon"}
                hint={
                  link.external
                    ? "Opens in a new tab."
                    : (hrefHint ?? "This page is coming soon, so the link won't open anything yet.")
                }
              >
                <TextInput
                  id={`link-href-${i}`}
                  value={link.href}
                  onChange={(e) => patch(i, { href: e.target.value })}
                  aria-invalid={problem ? true : undefined}
                  aria-describedby={problem ? `link-href-problem-${i}` : undefined}
                />
              </Field>

              {/* Advisory, not corrective: someone may be mid-paste, and a
                  field that rewrites itself as you type is impossible to
                  trust. The fix is one click away instead. */}
              {problem ? (
                <p
                  id={`link-href-problem-${i}`}
                  className="rounded-lg border border-admin-accent/25 bg-admin-accent-soft px-3 py-2.5 text-xs leading-relaxed text-admin-ink"
                >
                  {problem.message}
                  {problem.suggestion ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => patch(i, { href: problem.suggestion! })}
                        className="font-semibold underline underline-offset-2 hover:text-admin-accent"
                      >
                        Use {problem.suggestion}
                      </button>
                    </>
                  ) : null}
                </p>
              ) : null}

              <Toggle
                checked={Boolean(link.external)}
                onChange={(external) => patch(i, { external: external || undefined })}
                label="Opens outside the site"
                hint="Use for WhatsApp, Instagram and other external links."
              />
            </div>
          </ReorderRow>
          );
        })}
      </ul>

      {/* Starts empty, not pre-filled with "/". The slash was what invited a
          full address to be pasted after it, producing "/https:example.com". */}
      <AddButton onClick={() => onChange([...value, { label: "New link", href: "" }])}>
        {addLabel}
      </AddButton>
    </div>
  );
}
