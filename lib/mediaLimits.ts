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
