"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ImageAsset } from "@/data/types";
import { uploadMedia, deleteMedia } from "@/app/admin/actions";
import { ACCEPTED_MIME, MAX_UPLOAD_MB, checkUploadSize } from "@/lib/mediaLimits";
import { imageGuidance, type ImageSlot } from "@/lib/imageGuidance";
import { useDraft } from "./AdminDraftProvider";
import { mediaLibrary } from "./mediaLibrary";
import { Field, TextInput } from "./ui";
import { cn } from "@/lib/format";

/**
 * Picks an `ImageAsset`, from the built-in library or from an upload.
 *
 * Choosing a tile sets `src` + intrinsic `width`/`height` together, so the
 * object is always schema-valid. `alt` is edited separately because it's
 * required by `ImageAsset` and carries real accessibility weight — nothing
 * about a file upload can supply it.
 *
 * Uploads are immediate, not draft state: the file is written and live as soon
 * as it succeeds, regardless of whether the surrounding content is published.
 * The alternative — holding bytes in the browser until publish — would mean a
 * draft referencing an image the server has never seen.
 */
interface Tile {
  key: string;
  src: string;
  label: string;
  width: number;
  height: number;
  /** Built-ins can't be deleted; they're committed assets, not uploads. */
  mediaId?: string;
}

export function ImagePicker({
  value,
  onChange,
  idPrefix = "image",
  slot,
}: {
  value: ImageAsset;
  onChange: (next: ImageAsset) => void;
  idPrefix?: string;
  /** Which slot this fills, so the picker can state the shape it crops to. */
  slot?: ImageSlot;
}) {
  const { media, addMedia, dropMedia } = useDraft();
  const router = useRouter();
  const guidance = slot ? imageGuidance[slot] : null;
  const inputId = useId();

  const [isUploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tiles: Tile[] = [
    ...media.map((m) => ({
      key: m.id,
      src: m.src,
      label: m.label,
      width: m.width,
      height: m.height,
      mediaId: m.id,
    })),
    ...mediaLibrary.map((m) => ({
      key: m.src,
      src: m.src,
      label: m.label,
      width: m.width,
      height: m.height,
    })),
  ];

  const select = (t: Tile) =>
    onChange({ ...value, src: t.src, width: t.width, height: t.height });

  const upload = (file: File) => {
    setError(null);
    // Refused here rather than sent and rejected: an over-limit body fails in
    // transport as a framework error, never reaching the message below.
    const tooBig = checkUploadSize(file);
    if (tooBig) {
      setError(tooBig);
      return;
    }
    startUpload(async () => {
      const form = new FormData();
      form.set("file", file);
      const result = await uploadMedia(form);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      addMedia(result.item);
      /**
       * The library is also read on the server, in the dashboard layout.
       * Without this the client keeps the new photo in memory but the cached
       * server payload does not have it — so it is there now and gone after a
       * reload, which is exactly how an upload appears to vanish.
       */
      router.refresh();
      // Select it straight away — uploading a photo here always means wanting
      // to use it, and making the editor hunt for it in the grid is busywork.
      onChange({
        ...value,
        src: result.item.src,
        width: result.item.width,
        height: result.item.height,
      });
    });
  };

  const remove = (t: Tile) => {
    if (!t.mediaId) return;
    const inUse = value.src === t.src;
    if (
      !window.confirm(
        inUse
          ? `Delete “${t.label}”? It's the image currently selected here, and any published section using it will show a broken image.`
          : `Delete “${t.label}”? Any published section using it will show a broken image.`,
      )
    ) {
      return;
    }
    const id = t.mediaId;
    startUpload(async () => {
      const result = await deleteMedia(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      dropMedia(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {tiles.map((t) => {
          const active = value.src === t.src;
          return (
            <div key={t.key} className="group relative">
              <button
                type="button"
                onClick={() => select(t)}
                aria-pressed={active}
                title={t.label}
                className={cn(
                  "relative block aspect-[3/4] w-full overflow-hidden rounded-lg border transition-colors",
                  active
                    ? "border-admin-accent ring-2 ring-admin-accent/25"
                    : "border-admin-border hover:border-admin-border-strong",
                )}
              >
                <Image src={t.src} alt="" fill sizes="120px" className="object-cover" />
              </button>

              {t.mediaId ? (
                <button
                  type="button"
                  onClick={() => remove(t)}
                  disabled={isUploading}
                  /* Visible on hover, and always once focused, so it stays
                     reachable by keyboard rather than hover-only. */
                  className="absolute right-1 top-1 rounded-md bg-admin-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Delete {t.label}</span>
                  <span aria-hidden>Delete</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {guidance ? (
        <p className="rounded-lg border border-admin-border bg-admin-surface-alt px-3 py-2.5 text-xs leading-relaxed text-admin-muted">
          <span className="font-semibold text-admin-ink">
            Best size: {guidance.recommended}
          </span>{" "}
          &middot; {guidance.ratio}. {guidance.note}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          id={inputId}
          type="file"
          /* A hint for the file dialog only. The server decides what's really
             acceptable by decoding the bytes — this can be bypassed trivially. */
          accept={ACCEPTED_MIME}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            // Reset so picking the same file twice still fires a change.
            e.target.value = "";
          }}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "cursor-pointer rounded-lg border border-admin-border-strong bg-admin-surface px-3 py-1.5 text-sm font-medium text-admin-ink transition-colors hover:bg-admin-surface-alt",
            isUploading && "pointer-events-none opacity-60",
          )}
        >
          {isUploading ? "Uploading…" : "Upload photo"}
        </label>
        <p className="text-xs text-admin-muted">
          JPEG, PNG, WebP or AVIF, up to {MAX_UPLOAD_MB} MB.
          Converted to WebP automatically.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-admin-danger/25 bg-admin-danger/5 px-3 py-2.5 text-sm text-admin-danger"
        >
          {error}
        </p>
      ) : null}

      <Field
        label="Alt text"
        htmlFor={`${idPrefix}-alt`}
        hint="Describes the photo for screen readers and when images fail to load. Leave empty only if the image is purely decorative."
      >
        <TextInput
          id={`${idPrefix}-alt`}
          value={value.alt}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
          placeholder="e.g. Model in a black shell jacket on a red backdrop"
        />
      </Field>

      <p className="text-xs text-admin-subtle">
        {value.width} × {value.height} px
      </p>
    </div>
  );
}
