import { MediaLibraryBrowser } from "@/components/admin/MediaLibraryBrowser";

/**
 * Photos & Images — every image on the site in one place.
 *
 * The library itself comes from the draft provider, which the dashboard layout
 * already seeded from the media store, so this page adds no second read.
 */
export default function PhotosPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-admin-display text-2xl font-bold tracking-tight text-admin-ink">
          Photos &amp; Images
        </h1>
        <p className="mt-1 text-sm text-admin-muted">
          Every photo on the site. Upload here once and choose it from any
          section, or upload straight from a section &mdash; both end up in the
          same place.
        </p>
      </header>

      <MediaLibraryBrowser />
    </div>
  );
}
