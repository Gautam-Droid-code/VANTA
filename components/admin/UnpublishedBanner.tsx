"use client";

import { cn } from "@/lib/format";
import { useDraft } from "./AdminDraftProvider";
import { DotIcon } from "./AdminIcons";

/**
 * Persistent unpublished-changes bar. Sits directly under the top bar and only
 * appears once something is edited.
 *
 * "Publish" writes to the content store. It can fail — expired session, invalid
 * content, unwritable store — so the bar stays visible on failure and shows why
 * rather than clearing, which would look exactly like success.
 */
export function UnpublishedBanner() {
  const {
    isDirty,
    dirtySections,
    publish,
    discard,
    isPublishing,
    publishError,
    draftStatus,
    draftSavedAt,
    saveDraftNow,
    restoredDraft,
  } = useDraft();

  if (!isDirty) return null;

  /**
   * Says where the work actually is. "Saved as draft" is the load-bearing one:
   * without it the only visible state is "unpublished", which reads as "not
   * saved anywhere" and invites people to hover over Publish out of anxiety.
   */
  const saveLabel =
    draftStatus === "saving"
      ? "Saving…"
      : draftStatus === "error"
        ? "Couldn’t save draft"
        : draftSavedAt
          ? `Saved as draft ${draftSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
          : "Not saved yet";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-admin-accent/25 bg-admin-accent-soft px-4 py-3 lg:px-8">
      <DotIcon className="h-2 w-2 shrink-0 text-admin-accent" />
      <p className="text-sm text-admin-ink">
        <span className="font-semibold">Unpublished changes</span>
        <span className="text-admin-muted"> — {dirtySections.join(", ")}</span>
      </p>

      <span
        className={cn(
          "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          draftStatus === "error"
            ? "border-admin-danger/30 bg-white/60 text-admin-danger"
            : "border-admin-border bg-white/60 text-admin-muted",
        )}
      >
        {saveLabel}
      </span>

      {restoredDraft ? (
        <p className="basis-full text-xs text-admin-muted">
          These are unpublished changes from an earlier session, restored
          automatically. Publish them to put them live, or discard to go back to
          what the site shows now.
        </p>
      ) : null}

      {draftStatus === "error" ? (
        <p role="alert" className="basis-full text-sm font-medium text-admin-danger">
          Your draft couldn’t be saved, so these changes only exist in this tab.
          Don’t close it — try Save draft again.
        </p>
      ) : null}

      {publishError ? (
        <p role="alert" className="basis-full text-sm font-medium text-admin-danger">
          {publishError}
        </p>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={saveDraftNow}
          disabled={isPublishing || draftStatus === "saving"}
          className="rounded-lg border border-admin-border-strong bg-white px-3 py-1.5 text-sm font-medium text-admin-ink transition-colors hover:bg-admin-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={discard}
          disabled={isPublishing}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-admin-muted transition-colors hover:bg-white hover:text-admin-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={isPublishing}
          /* Disabled while in flight so a second click can't race the first. */
          className="rounded-lg bg-admin-accent px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-admin-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPublishing ? "Publishing…" : "Publish changes"}
        </button>
      </div>
    </div>
  );
}
