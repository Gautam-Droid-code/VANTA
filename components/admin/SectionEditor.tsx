"use client";

import { useState } from "react";
import type { BrandStatementContent, HeroContent } from "@/data/types";
import { HeadlineEditor } from "./HeadlineEditor";
import { BackdropPicker } from "./BackdropPicker";
import { ImagePicker } from "./ImagePicker";
import { SectionPreview } from "./SectionPreview";
import { Button, Card, CardHeader, Field, Pill, TextArea, TextInput } from "./ui";
import { useDraft } from "./AdminDraftProvider";

/**
 * ONE editor for both editorial sections.
 *
 * `HeroContent` and `BrandStatementContent` are *nearly* identical — but
 * `BrandStatementContent` also has a required `eyebrow: string` that the hero
 * doesn't have (see DECISIONS.md §15). Rather than fork the component, the
 * eyebrow field is rendered only when the section supplies one, and the value
 * is carried through untouched.
 */

type EditorValue = HeroContent | BrandStatementContent;

const hasEyebrow = (v: EditorValue): v is BrandStatementContent => "eyebrow" in v;

export function SectionEditor({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: EditorValue;
  onChange: (next: EditorValue) => void;
}) {
  const { publish, isDirty } = useDraft();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const patch = (p: Partial<BrandStatementContent>) =>
    onChange({ ...value, ...p } as EditorValue);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-admin-display text-2xl font-bold tracking-tight text-admin-ink">
            {title}
          </h1>
          <p className="mt-1 text-sm text-admin-muted">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setSavedAt(new Date().toLocaleTimeString())}
            disabled={!isDirty}
          >
            Save draft
          </Button>
          <Button variant="primary" onClick={publish} disabled={!isDirty}>
            Publish changes
          </Button>
        </div>
      </header>

      {savedAt && (
        <p className="mb-4 text-xs text-admin-muted">
          Draft kept since {savedAt}. Publish to make it live.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* Form */}
        <div className="space-y-5">
          {hasEyebrow(value) && (
            <Card>
              <CardHeader title="Eyebrow" hint="Small label above the headline." />
              <div className="p-5">
                <Field label="Eyebrow text" htmlFor="eyebrow">
                  <TextInput
                    id="eyebrow"
                    value={value.eyebrow}
                    onChange={(e) => patch({ eyebrow: e.target.value })}
                  />
                </Field>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Headline"
              hint="Mix bold sans and italic serif, line by line."
            />
            <div className="p-5">
              <HeadlineEditor
                value={value.headline}
                onChange={(headline) => patch({ headline })}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Description" />
            <div className="p-5">
              <Field
                label="Body copy"
                htmlFor="description"
                hint={`${value.description.length} characters`}
              >
                <TextArea
                  id="description"
                  rows={4}
                  value={value.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>

              {/* Spelled out rather than left as a terse hint. The person using
                  this has no reason to know whether a line break survives to
                  the website — and until it visibly does, pressing Enter looks
                  like it might be throwing their formatting away. */}
              <p className="mt-3 rounded-lg border border-admin-border bg-admin-surface-alt px-3 py-2.5 text-xs leading-relaxed text-admin-muted">
                <span className="font-semibold text-admin-ink">Starting a new line:</span>{" "}
                put your cursor where you want the text to break and press{" "}
                <kbd className="rounded border border-admin-border bg-admin-surface px-1.5 py-0.5 font-sans text-[11px] font-semibold text-admin-ink">
                  Enter
                </kbd>
                . The break will appear on the website exactly where you put it.
                Leave a blank line to put a gap between paragraphs.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Image" hint="Photo shown alongside the headline." />
            <div className="p-5">
              <ImagePicker
                value={value.image}
                onChange={(image) => patch({ image })}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Backdrop"
              hint="The colour panel behind the photo. Same four options used across the site."
            />
            <div className="p-5">
              <BackdropPicker
                value={value.backdrop}
                onChange={(backdrop) => patch({ backdrop })}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Button" />
            <div className="space-y-4 p-5">
              <Field label="Button text" htmlFor="cta-label">
                <TextInput
                  id="cta-label"
                  value={value.cta.label}
                  onChange={(e) => patch({ cta: { ...value.cta, label: e.target.value } })}
                />
              </Field>

              <Field
                label="Button link"
                htmlFor="cta-href"
                note="Not yet active"
                hint="The page this button opens is coming soon, so it won't go anywhere yet."
              >
                <TextInput
                  id="cta-href"
                  value={value.cta.href}
                  onChange={(e) => patch({ cta: { ...value.cta, href: e.target.value } })}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <SectionPreview
            eyebrow={hasEyebrow(value) ? value.eyebrow : undefined}
            headline={value.headline}
            description={value.description}
            ctaLabel={value.cta.label}
            image={value.image}
            backdrop={value.backdrop}
          />
          <div className="mt-4 flex items-center gap-2">
            <Pill tone="accent">Preview only</Pill>
            <span className="text-xs text-admin-muted">
              Your edits are lost if you reload this page.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
