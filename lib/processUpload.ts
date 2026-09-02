/**
 * Server-only. Importing this from a client component is a build error naming
 * this file, rather than a native module silently ending up in the browser
 * bundle — which fails as an unrelated "cannot read properties of undefined"
 * where the component is rendered. Client-safe constants live in
 * `lib/mediaLimits.ts`.
 */
import "server-only";

import { randomBytes } from "node:crypto";
import sharp, { type Metadata, type Sharp } from "sharp";
import type { MediaItem } from "./mediaStore";
import { MEDIA_URL_PREFIX } from "./mediaStore";
import { MAX_UPLOAD_BYTES } from "./mediaLimits";

/**
 * Turns an uploaded file into a stored, safe-to-serve WebP.
 *
 * The guiding assumption is that an upload is hostile until decoded. A browser
 * controls the filename, the extension and the Content-Type header, so none of
 * those are evidence of anything. The only thing that proves a file is an image
 * is an image decoder accepting it — which is why every check below happens
 * against sharp's reading of the bytes, not against what the request claimed.
 */

/**
 * Formats accepted, by what sharp detects — not by the file's extension.
 *
 * SVG is deliberately absent. It is not a raster image but a document that can
 * carry <script> and external references; serving one from our own origin would
 * hand an editor a stored-XSS primitive. GIF is excluded because re-encoding
 * one to still WebP silently destroys the animation.
 */
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "tiff"]);

/** Largest edge kept. Beyond this is wasted bytes for a storefront photo. */
/**
 * The longest edge kept. Everything above it is discarded here, which is why
 * `lib/downscaleImage.ts` shrinks to the same number in the browser before
 * upload — see §36. **Change both together**, or the client will either send
 * more than is kept or less than is wanted.
 */
const MAX_DIMENSION = 2400;

export interface ProcessedUpload {
  item: MediaItem;
  data: Buffer;
}

export type ProcessResult =
  | { ok: true; value: ProcessedUpload }
  | { ok: false; error: string };

/**
 * Strips anything path-like out of the client's filename before it is used as a
 * display label. It never reaches the filesystem — the stored name is a
 * generated id — but a label containing `../` or control characters would still
 * be misleading in the UI.
 */
function safeLabel(name: string): string {
  const base = name.replace(/^.*[\/]/, "").replace(/\.[^.]+$/, "");
  const cleaned = base.replace(/[^\w\s.-]/g, "").trim();
  return (cleaned || "Untitled").slice(0, 80);
}

export async function processUpload(file: File): Promise<ProcessResult> {
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
    };
  }

  const input = Buffer.from(await file.arrayBuffer());

  let pipeline: Sharp;
  let meta: Metadata;
  try {
    /**
     * `limitInputPixels` caps the decoded pixel count. Without it a small,
     * highly compressed file can expand to gigabytes in memory once decoded —
     * a decompression bomb. The file-size check above cannot catch that,
     * because the danger is in the decoded size, not the encoded size.
     */
    pipeline = sharp(input, { limitInputPixels: 100_000_000, animated: false });
    meta = await pipeline.metadata();
  } catch {
    return { ok: false, error: "That file isn’t an image we can read." };
  }

  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    return {
      ok: false,
      error: `${meta.format ? `${meta.format.toUpperCase()} files aren’t` : "That file type isn’t"} supported. Use JPEG, PNG, WebP or AVIF.`,
    };
  }
  if (!meta.width || !meta.height) {
    return { ok: false, error: "That image has no readable dimensions." };
  }

  let output: Buffer;
  try {
    /**
     * Re-encoding is a security step as much as a format one. Decoding to raw
     * pixels and writing a fresh WebP means nothing of the original container
     * survives: no EXIF (phone photos carry GPS coordinates), no colour-profile
     * payloads, no trailing data appended after the image to make a polyglot
     * file. What gets served is a file this process wrote, byte for byte.
     *
     * `rotate()` with no argument applies the EXIF orientation before that
     * metadata is discarded — otherwise portrait phone photos come out sideways.
     */
    output = await pipeline
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { ok: false, error: "Couldn’t process that image. Try a different file." };
  }

  // Dimensions are re-read from the encoded output, not carried over from the
  // input: the resize above may have changed them, and `ImageAsset` requires
  // the true intrinsic size or `next/image` lays the page out wrongly.
  const finalMeta = await sharp(output).metadata();
  if (!finalMeta.width || !finalMeta.height) {
    return { ok: false, error: "Couldn’t process that image. Try a different file." };
  }

  const id = randomBytes(16).toString("hex");

  return {
    ok: true,
    value: {
      data: output,
      item: {
        id,
        src: `${MEDIA_URL_PREFIX}/${id}`,
        label: safeLabel(file.name),
        width: finalMeta.width,
        height: finalMeta.height,
        bytes: output.byteLength,
        uploadedAt: new Date().toISOString(),
      },
    },
  };
}
