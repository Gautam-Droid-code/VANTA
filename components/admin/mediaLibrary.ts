import type { ImageAsset } from "@/data/types";

/**
 * Available imagery for the image picker.
 *
 * STUB: a hardcoded list of what's actually in `/public/images`, not a real
 * upload pipeline. Real upload needs a storage target and the WebP conversion
 * step described in README ("Adding an image"), which is out of scope for this
 * phase. Dimensions here are the true intrinsic sizes, so picking one produces
 * a valid `ImageAsset`.
 */
export const mediaLibrary: Array<Omit<ImageAsset, "alt"> & { label: string }> = [
  { label: "Model 01 — red backdrop", src: "/images/model-01.webp", width: 848, height: 1264 },
  { label: "Model 02 — orange backdrop", src: "/images/model-02.webp", width: 848, height: 1264 },
  { label: "Model 03 — sunset backdrop", src: "/images/model-03.webp", width: 848, height: 1264 },
  {
    label: "Shell jacket — product",
    src: "/images/product-shell-jacket.webp",
    width: 896,
    height: 1200,
  },
  {
    label: "Cargo pant — product",
    src: "/images/product-cargo-pant.webp",
    width: 896,
    height: 1200,
  },
];

export function findMedia(src: string) {
  return mediaLibrary.find((m) => m.src === src);
}
