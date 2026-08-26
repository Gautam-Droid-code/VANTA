import { MEDIA_ID_PATTERN, mediaStore } from "@/lib/mediaStore";

/**
 * Serves an uploaded image.
 *
 * Uploads live outside `/public` (see `lib/mediaStore.ts`), so they need a route
 * to reach the browser. This is deliberately the dullest possible one: it takes
 * an id, refuses anything that isn't a 32-character hex id, looks it up in the
 * manifest, and returns bytes.
 *
 * What it never does is build a filesystem path out of the request. The id is
 * matched against a generated-id pattern and then checked against the manifest;
 * a path is only constructed from an id already known to be ours. Traversal
 * (`../`) can't survive the pattern check, and even if it did there is nothing
 * to traverse to, because the request string is not concatenated into a path.
 *
 * Public on purpose — these are storefront photos, and the homepage that
 * displays them is public too. Nothing private is served from here.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!MEDIA_ID_PATTERN.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const data = await mediaStore.readFileById(id);
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      // Everything here is WebP: `processUpload` re-encodes on the way in, so
      // the type is a fact about our own output, not a guess about the upload.
      "Content-Type": "image/webp",
      // Ids are content-addressed by generation — a given id's bytes never
      // change, because editing an image means uploading a new one.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Belt and braces: even though this only ever emits image/webp, this
      // stops a browser from second-guessing the type and rendering it as
      // something executable.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
