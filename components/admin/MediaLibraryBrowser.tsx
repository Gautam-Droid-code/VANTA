"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { deleteMedia, uploadMedia } from "@/app/admin/actions";
import { ACCEPTED_MIME, MAX_UPLOAD_MB, checkUploadSize } from "@/lib/mediaLimits";
import { imageGuidance } from "@/lib/imageGuidance";
import { useDraft } from "./AdminDraftProvider";
import { mediaLibrary } from "./mediaLibrary";
import { Button, Card, CardHeader } from "./ui";
import { cn } from "@/lib/format";

/**
 * Every photo on the site, in one place.
 *
 * The picker inside each editor shows the same library, but only ever as a
 * grid of choices. This is where a photo can be looked at properly: how big it
 * is, what it weighs, when it went up, and — the question the picker cannot
 * answer — whether anything is currently using it.
 */
interface Row {
  key: string;
  src: string;
  label: string;
  width: number;
  height: number;
  bytes?: number;
  uploadedAt?: string;
  /** Built-ins ship with the repo and cannot be deleted from here. */
  mediaId?: string;
}

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

export function MediaLibraryBrowser() {
  const { media, addMedia, dropMedia, content, products } = useDraft();
  const router = useRouter();
  const inputId = useId();

  const [isBusy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const rows: Row[] = [
    ...media.map((m) => ({ ...m, key: m.id, mediaId: m.id })),
    ...mediaLibrary.map((m) => ({ ...m, key: m.src })),
  ];

  /**
   * Where each photo is used, by walking the draft content for `src` values.
   *
   * Computed here rather than stored, because a stored answer would be wrong
   * the moment someone changed a section without updating it. It reads the
   * draft, so it reflects unpublished edits too — which is what someone about
   * to delete a photo needs to know.
   */
  const usage = useMemo(() => {
    const map = new Map<string, string[]>();
    const note = (src: string | undefined, where: string) => {
      if (!src) return;
      map.set(src, [...(map.get(src) ?? []), where]);
    };

    note(content.hero.image.src, "Hero");
    content.lookbook.slides.forEach((s, i) => note(s.image.src, `Lookbook slide ${i + 1}`));
    note(content.brandStatement.image.src, "Brand Statement");
    content.categories.items.forEach((c) => {
      note(c.image.src, `Category — ${c.name}`);
      note(c.banner?.src, `Category banner — ${c.name}`);
    });
    products.forEach((p) => note(p.image.src, `Product — ${p.name}`));

    return map;
  }, [content, products]);

  const upload = (file: File) => {
    setError(null);
    // See ImagePicker: an over-limit body dies in transport, so the size is
    // checked before the request rather than inside the action.
    const tooBig = checkUploadSize(file);
    if (tooBig) {
      setError(tooBig);
      return;
    }
    startTransition(async () => {
      const form = new FormData();
      form.set("file", file);
      const result = await uploadMedia(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      addMedia(result.item);
      // Keeps the server-rendered library in step with what is on disk.
      router.refresh();
    });
  };

  const remove = (row: Row) => {
    if (!row.mediaId) return;
    const usedIn = usage.get(row.src) ?? [];
    const warning = usedIn.length
      ? `“${row.label}” is used in ${usedIn.length} place${usedIn.length === 1 ? "" : "s"}: ${usedIn.join(", ")}. Deleting it will leave a broken image there.\n\nDelete anyway?`
      : `Delete “${row.label}”? This cannot be undone.`;
    if (!window.confirm(warning)) return;

    const id = row.mediaId;
    startTransition(async () => {
      const result = await deleteMedia(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      dropMedia(id);
      setSelected(null);
      router.refresh();
    });
  };

  const active = rows.find((r) => r.key === selected) ?? null;
  const activeUsage = active ? (usage.get(active.src) ?? []) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Add photos"
          hint={`JPEG, PNG, WebP or AVIF, up to ${MAX_UPLOAD_MB} MB. Converted to WebP automatically.`}
        />
        <div className="space-y-4 p-5">
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_MIME}
            multiple
            className="sr-only"
            onChange={(e) => {
              // One at a time, so a failure names the file that failed rather
              // than abandoning a whole batch.
              Array.from(e.target.files ?? []).forEach(upload);
              e.target.value = "";
            }}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "inline-block cursor-pointer rounded-lg bg-admin-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-admin-accent-hover",
              isBusy && "pointer-events-none opacity-60",
            )}
          >
            {isBusy ? "Uploading…" : "Upload photos"}
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-admin-danger/25 bg-admin-danger/5 px-3 py-2.5 text-sm text-admin-danger"
            >
              {error}
            </p>
          ) : null}

          <details className="text-xs text-admin-muted">
            <summary className="cursor-pointer font-medium text-admin-ink">
              What size should photos be?
            </summary>
            <ul className="mt-3 space-y-2">
              {Object.entries(imageGuidance).map(([key, g]) => (
                <li key={key}>
                  <span className="font-semibold text-admin-ink">{g.recommended}</span> &middot;{" "}
                  {g.ratio} — {g.note}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Library"
          hint={`${rows.length} photos — ${media.length} uploaded, ${mediaLibrary.length} built in.`}
        />
        <div className="p-5">
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {rows.map((row) => {
              const used = (usage.get(row.src) ?? []).length;
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(row.key === selected ? null : row.key)}
                    aria-pressed={row.key === selected}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-lg border transition-colors",
                      row.key === selected
                        ? "border-admin-accent ring-2 ring-admin-accent/25"
                        : "border-admin-border hover:border-admin-border-strong",
                    )}
                  >
                    <Image src={row.src} alt="" fill sizes="160px" className="object-cover" />
                    {used === 0 && row.mediaId ? (
                      /* Unused uploads are the ones safe to clear out, so they
                         are the ones worth marking. */
                      <span className="absolute bottom-1 left-1 rounded bg-admin-ink/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                        Unused
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>

      {active ? (
        <Card>
          <CardHeader title={active.label} />
          <div className="grid gap-5 p-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-admin-border">
              <Image src={active.src} alt="" fill sizes="200px" className="object-contain" />
            </div>

            <div className="space-y-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-admin-muted">Size</dt>
                  <dd className="text-admin-ink">
                    {active.width} × {active.height}px
                  </dd>
                </div>
                {active.bytes ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-admin-muted">File</dt>
                    <dd className="text-admin-ink">{formatBytes(active.bytes)}</dd>
                  </div>
                ) : null}
                {active.uploadedAt ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-admin-muted">Added</dt>
                    <dd className="text-admin-ink">
                      {new Date(active.uploadedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                ) : (
                  <div className="flex justify-between gap-4">
                    <dt className="text-admin-muted">Source</dt>
                    <dd className="text-admin-ink">Built in</dd>
                  </div>
                )}
              </dl>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-admin-subtle">
                  Used in
                </p>
                {activeUsage.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-admin-ink">
                    {activeUsage.map((where) => (
                      <li key={where}>{where}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-admin-muted">
                    Nothing is using this photo.
                  </p>
                )}
              </div>

              {active.mediaId ? (
                <Button variant="ghost" onClick={() => remove(active)} disabled={isBusy}>
                  Delete photo
                </Button>
              ) : (
                <p className="text-xs text-admin-muted">
                  Built-in photos ship with the site and can&rsquo;t be deleted here.
                </p>
              )}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
