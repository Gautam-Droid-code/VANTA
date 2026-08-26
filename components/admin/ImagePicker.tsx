"use client";

import Image from "next/image";
import type { ImageAsset } from "@/data/types";
import { mediaLibrary } from "./mediaLibrary";
import { Field, TextInput } from "./ui";
import { cn } from "@/lib/format";

/**
 * Picks an `ImageAsset`. Choosing a tile sets `src` + intrinsic `width`/`height`
 * together, so the object is always schema-valid. `alt` is edited separately
 * because it's required by `ImageAsset` and carries real accessibility weight.
 */
export function ImagePicker({
  value,
  onChange,
  idPrefix = "image",
}: {
  value: ImageAsset;
  onChange: (next: ImageAsset) => void;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {mediaLibrary.map((m) => {
          const active = value.src === m.src;
          return (
            <button
              key={m.src}
              type="button"
              onClick={() => onChange({ ...value, src: m.src, width: m.width, height: m.height })}
              aria-pressed={active}
              title={m.label}
              className={cn(
                "relative aspect-[3/4] overflow-hidden rounded-lg border transition-colors",
                active
                  ? "border-admin-accent ring-2 ring-admin-accent/25"
                  : "border-admin-border hover:border-admin-border-strong",
              )}
            >
              <Image
                src={m.src}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          );
        })}
      </div>

      <p className="text-xs text-admin-muted">
        Choose from the site&rsquo;s photo library. Uploading new photos is
        coming soon.
      </p>

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
