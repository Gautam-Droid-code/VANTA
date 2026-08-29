/**
 * Upload limits, in a module with no imports.
 *
 * These are shared by the server pipeline and the picker UI. They live here
 * rather than in `lib/processUpload.ts` because that module imports `sharp`, a
 * native Node binary — importing a single constant from it into a client
 * component would pull sharp into the browser bundle and break the build.
 *
 * The client uses these for labels and a file-dialog filter only. Nothing here
 * is a security control: the browser can send whatever it likes, so the real
 * checks all happen server-side against the decoded bytes.
 */

/** 12 MB. Applied before decoding, so a huge file is rejected without work. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / 1024 / 1024;

/** Mirrors the server's allowlist, for the file dialog's `accept` filter. */
export const ACCEPTED_MIME = "image/jpeg,image/png,image/webp,image/avif,image/tiff";

/**
 * Checks a file's size before it is uploaded, returning an error or null.
 *
 * Client-side, and deliberately not the real control — `processUpload` decodes
 * the bytes server-side and is what actually decides. This exists because the
 * transport gives up first: a Server Action body over its limit fails as a
 * framework error the visitor cannot act on, so an oversized file has to be
 * caught before it is sent in order to be explained at all.
 */
export function checkUploadSize(file: { size: number; name: string }): string | null {
  if (file.size === 0) return `“${file.name}” is empty.`;
  if (file.size > MAX_UPLOAD_BYTES) {
    return `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_MB} MB.`;
  }
  return null;
}
