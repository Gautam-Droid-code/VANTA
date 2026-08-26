"use client";

import { useDraft } from "./AdminDraftProvider";
import { DotIcon } from "./AdminIcons";

/**
 * Persistent unpublished-changes bar. Sits directly under the top bar and only
 * appears once something is edited.
 *
 * "Publish" clears the dirty state but does not persist anything in this phase
 * — the copy says so, so nobody mistakes it for a save.
 */
export function UnpublishedBanner() {
  const { isDirty, dirtySections, publish, discard } = useDraft();

  if (!isDirty) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-admin-accent/25 bg-admin-accent-soft px-4 py-3 lg:px-8">
      <DotIcon className="h-2 w-2 shrink-0 text-admin-accent" />
      <p className="text-sm text-admin-ink">
        <span className="font-semibold">Unpublished changes</span>
        <span className="text-admin-muted"> — {dirtySections.join(", ")}</span>
      </p>

      <span className="rounded border border-admin-accent/30 bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-admin-accent">
        Preview only
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={discard}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-admin-muted transition-colors hover:bg-white hover:text-admin-ink"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={publish}
          className="rounded-lg bg-admin-accent px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-admin-accent-hover"
        >
          Publish changes
        </button>
      </div>
    </div>
  );
}
