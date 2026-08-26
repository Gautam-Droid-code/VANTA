"use client";

import { useState } from "react";
import { useDraft } from "./AdminDraftProvider";
import { Button, Pill } from "./ui";

/**
 * Shared chrome for every section editor: title, save/publish actions, and the
 * preview-only caveat. `SectionEditor` (Hero / Brand Statement) has its own
 * two-column layout, so it renders these controls itself; the list-style
 * editors use this wrapper.
 */
export function SectionPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { publish, isDirty } = useDraft();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-admin-display text-2xl font-bold tracking-tight text-admin-ink">
            {title}
          </h1>
          <p className="mt-1 text-sm text-admin-muted">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setSavedAt(new Date().toLocaleTimeString())} disabled={!isDirty}>
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

      {children}

      <div className="mt-6 flex items-center gap-2">
        <Pill tone="accent">Preview only</Pill>
        <span className="text-xs text-admin-muted">
          Your edits are lost if you reload this page.
        </span>
      </div>
    </div>
  );
}
