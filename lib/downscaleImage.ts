/**
 * Shrinks an image in the browser before it is uploaded.
 *
 * No imports, no `server-only` — this runs in the client bundle alongside
 * `lib/mediaLimits.ts`, and for the same reason: `lib/processUpload.ts` pulls
 * in `sharp`, a native binary that must never reach the browser.
 *
 * ## Why this exists
 *
 * Vercel caps a function's request body at **4.5 MB** and the limit is a
 * platform one — `serverActions.bodySizeLimit` in `next.config.mjs` cannot
 * raise it. An ordinary phone photo is 3–8 MB, so uploads that work locally
 * die in transport on Vercel with a platform `413
 * FUNCTION_PAYLOAD_TOO_LARGE`, *before* any application code runs. The
 * friendly message `processUpload` would have produced never gets the chance.
 *
 * ## Why downscaling rather than a presigned direct upload
 *
 * The decisive fact is that **the server already throws this data away**.
 * `processUpload` resizes to `MAX_DIMENSION = 2400` and re-encodes to WebP at
 * quality 82. Every pixel beyond 2400 and every byte of the original encoding
 * is discarded server-side today. Sending a 12-megapixel original spends
 * megabytes of a customer's connection on information the pipeline deletes on
 * arrival.
 *
 * So this is not a workaround for a platform limit that happens to also help —
 * it is the correct behaviour, and the limit merely made the waste visible.
 * Uploading direct to Blob storage with a presigned URL would raise the ceiling
 * instead, and cost three things worth more than the ceiling:
 *
 * - **It bypasses `processUpload`**, which is a security control, not an
 *   optimisation: it decodes the bytes, rejects anything that is not a
 *   supported raster image, strips the original container and every piece of
 *   EXIF along with it. Keeping that would mean re-fetching each upload from
 *   storage and reprocessing it — more moving parts, and a window where an
 *   unvalidated file is already in the bucket.
 * - **It only works on one platform.** The file adapter has no 4.5 MB problem,
 *   so the browser would need two upload paths chosen by environment — the
 *   divergence §34 exists to prevent.
 * - Its completion callback cannot reach `localhost`, so local development
 *   would need a tunnel.
 *
 * The honest cost of the choice: the server never sees the original pixels. For
 * a storefront catalogue that is exactly what was already happening one hop
 * later.
 */

/**
 * Matches `MAX_DIMENSION` in `lib/processUpload.ts`. Deliberately the same
 * number: this is the point of "no information is lost". If that server-side
 * cap ever changes, this must change with it — hence the note in both files.
 */
export const CLIENT_MAX_DIMENSION = 2400;

/**
 * Above this, re-encode. Below it, send the original untouched.
 *
 * A small file that is already within bounds gains nothing from a decode and
 * re-encode, and would lose a little quality for no transport saving. 3 MB
 * leaves comfortable headroom under Vercel's 4.5 MB once multipart framing and
 * the action's own payload are added.
 */
const REENCODE_ABOVE_BYTES = 3 * 1024 * 1024;

/** High enough that the server's own quality-82 pass is the one that shows. */
const CLIENT_WEBP_QUALITY = 0.92;

export interface DownscaleResult {
  file: File;
  /** True when the bytes were re-encoded, for an honest progress message. */
  changed: boolean;
  originalBytes: number;
}

/**
 * Returns a file safe to send, or the original when nothing is gained.
 *
 * **Never throws and never rejects.** Every failure path returns the original
 * file, because the server-side limit check still runs and will produce a
 * message the operator can act on. A browser that cannot decode the image is
 * not a reason to refuse the upload here — it is a reason to let the pipeline
 * that *can* decode it decide.
 */
export async function downscaleForUpload(file: File): Promise<DownscaleResult> {
  const unchanged: DownscaleResult = { file, changed: false, originalBytes: file.size };

  // Canvas flattens an animated image to its first frame. `sharp` does the same
  // without `animated: true`, so this changes nothing about the result — but a
  // small animation is left alone rather than silently becoming a still.
  if (file.size <= REENCODE_ABOVE_BYTES) return unchanged;

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return unchanged;
  }

  let bitmap: ImageBitmap;
  try {
    /**
     * `imageOrientation: "from-image"` applies EXIF rotation while decoding.
     * Without it a portrait phone photo would be re-encoded in its stored
     * landscape orientation and the rotation tag would be dropped with the
     * original container — the image would arrive on its side. `sharp`'s
     * `.rotate()` does the same job on the server for the un-downscaled path.
     */
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return unchanged;
  }

  try {
    const scale = Math.min(1, CLIENT_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return unchanged;
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", CLIENT_WEBP_QUALITY);
    });
    if (!blob) return unchanged;

    // A re-encode that made the file bigger is a re-encode worth discarding —
    // possible for an already-optimised WebP that happens to be large.
    if (blob.size >= file.size) return unchanged;

    return {
      file: new File([blob], `${stripExtension(file.name)}.webp`, { type: "image/webp" }),
      changed: true,
      originalBytes: file.size,
    };
  } catch {
    return unchanged;
  } finally {
    bitmap.close();
  }
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}
