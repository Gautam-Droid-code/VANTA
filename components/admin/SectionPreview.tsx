"use client";

import { useState } from "react";
import Image from "next/image";
import type { HeadlineLine, ImageAsset, Backdrop } from "@/data/types";
import { backdropClass } from "@/lib/backdrops";
import { cn } from "@/lib/format";

/**
 * Live preview of an editorial section.
 *
 * APPROXIMATION, not the real component. `Hero` / `BrandStatement` are server
 * components and can't be imported into this client tree, so this reproduces
 * their layout using the same tokens, fonts and `backdropClass` gradients.
 * It's for judging copy, image and backdrop choices — not pixel sign-off.
 */
export function SectionPreview({
  eyebrow,
  headline,
  description,
  ctaLabel,
  image,
  backdrop,
}: {
  eyebrow?: string;
  headline: HeadlineLine[];
  description: string;
  ctaLabel: string;
  image: ImageAsset;
  backdrop: Backdrop;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const isMobile = device === "mobile";

  return (
    <div className="sticky top-32">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-admin-display text-sm font-semibold tracking-tight text-admin-ink">
          Live preview
        </h2>
        <div className="flex rounded-lg border border-admin-border bg-admin-surface p-0.5">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              aria-pressed={device === d}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                device === d
                  ? "bg-admin-ink text-bone"
                  : "text-admin-muted hover:text-admin-ink",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-admin-border bg-ink">
        <div className={cn("mx-auto", isMobile ? "max-w-[320px]" : "w-full")}>
          {isMobile ? (
            <div>
              <div className={cn("relative aspect-[4/5] w-full", backdropClass[backdrop])}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="320px"
                  className="object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
                  <PreviewHeadline lines={headline} className="text-2xl text-bone" />
                </div>
              </div>
              <div className="p-4">
                <p className="whitespace-pre-line text-[11px] leading-relaxed text-bone/70">{description}</p>
                <span className="mt-4 block w-full rounded-full bg-bone px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                  {ctaLabel}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 items-center gap-6 py-8 pl-6">
              <div>
                {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
                <PreviewHeadline lines={headline} className="text-[26px] text-bone" />
                <p className="mt-4 max-w-[28ch] whitespace-pre-line text-[11px] leading-relaxed text-bone/70">
                  {description}
                </p>
                <span className="mt-5 inline-block rounded-full bg-bone px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                  {ctaLabel}
                </span>
              </div>
              <div className={cn("relative aspect-[4/5] w-full", backdropClass[backdrop])}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="320px"
                  className="object-cover object-top"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-admin-muted">
        A close guide to how this will look. Spacing and text size differ
        slightly on the live site.
      </p>
    </div>
  );
}

function PreviewHeadline({ lines, className }: { lines: HeadlineLine[]; className?: string }) {
  return (
    <div className={cn("headline leading-[0.9]", className)}>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line.map((seg, j) =>
            seg.accent ? <em key={j}>{seg.text}</em> : <span key={j}>{seg.text}</span>,
          )}
        </span>
      ))}
    </div>
  );
}
