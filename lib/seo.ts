import type { Metadata } from "next";

/**
 * One place that builds page metadata.
 *
 * Every route used to hand-write its own object literal, and they drifted in
 * three ways at once:
 *
 * - **Double branding.** `app/layout.tsx` sets `title.template: "%s | VANTA"`,
 *   and every page also ended its own title with `— VANTA`. The rendered result
 *   was `Bag — VANTA | VANTA`, on every page, including the ones a customer is
 *   most likely to have open in a tab. A page passes its *bare* name here now
 *   and the template supplies the brand exactly once.
 * - **No canonical anywhere but `/products`.** Which meant every sorted,
 *   filtered or query-carrying URL was its own indexable page competing with
 *   the one that matters.
 * - **Descriptions that were not descriptions.** Product pages used
 *   `product.image.alt`, which describes the *photograph* ("technical shell
 *   jacket on a red backdrop") and, per §12, describes a stand-in photograph at
 *   that. It said nothing about the garment, the price or the category.
 *
 * The fix for all three is the same: one function, called by every route, that
 * cannot be half-filled.
 */

/** Roughly what a search result renders before truncating. */
const DESCRIPTION_MAX = 160;

/**
 * The site-wide share card from `app/opengraph-image.tsx`, and why it has to be
 * named here rather than left to Next's file convention.
 *
 * Declaring an `openGraph` object in a route's metadata **replaces** the one it
 * would otherwise inherit — including the file-convention image. Measured: once
 * every route started going through this helper, `og:image` was present on `/`
 * and missing on `/products`, `/collections/[slug]` and the policy pages, which
 * is every link anybody would actually share. Setting it explicitly restores it.
 *
 * A route with its own generated card passes `image` and overrides this.
 */
const SITE_OG_IMAGE = "/opengraph-image";
const OG_SIZE = { width: 1200, height: 630 };
const SITE_OG_ALT = "VANTA — Technical Streetwear, Made in Mumbai";

export interface PageMetaInput {
  /**
   * The page's own name, with **no brand suffix** — "Bag", not "Bag — VANTA".
   * `title.template` in the root layout adds the brand.
   */
  title: string;
  /** One sentence, 140–160 characters, about what is actually on this page. */
  description: string;
  /**
   * Path only. Query strings are stripped rather than rejected: a canonical
   * carrying `?sort=price-asc` tells a crawler the sorted view is a distinct
   * page, which is the exact duplicate-content problem canonicals exist to
   * solve. `/search?q=jacket` canonicalises to `/search`.
   */
  path: string;
  /**
   * Share image, root-relative or absolute. Omit to use the site-wide card;
   * pass one for a route that generates its own.
   */
  image?: string;
  /** Alt text for a route-specific `image`. Ignored when `image` is omitted. */
  imageAlt?: string;
  type?: "website" | "article";
  /**
   * Private pages. Sets `index: false, follow: false` — a bag, an order or a
   * checkout has nothing a crawler should reach and nothing it should follow
   * out of.
   */
  noindex?: boolean;
}

/** Trims on a word boundary so a description never ends mid-word. */
export function clampDescription(text: string, max = DESCRIPTION_MAX): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

/** Strips query and hash, and guarantees a single leading slash. */
function canonicalPath(path: string): string {
  const clean = path.split(/[?#]/)[0];
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  // Trailing slash removed so `/products/` and `/products` cannot both be
  // canonical. The root is the one path that keeps its slash.
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : "/";
}

/**
 * Builds a complete `Metadata` object.
 *
 * `alternates.canonical` is left relative on purpose. Next resolves it against
 * `metadataBase` (set in `app/layout.tsx` from `lib/siteUrl.ts`) and emits an
 * absolute URL — so the canonical is correct per deployment without any route
 * knowing what the deployment's domain is. Verified in the rendered HTML, not
 * assumed.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  type = "website",
  noindex = false,
}: PageMetaInput): Metadata {
  const url = canonicalPath(path);
  const clamped = clampDescription(description);
  // OpenGraph has no template of its own, so the brand is added explicitly.
  // Without this the share card title would be the bare page name.
  const branded = title.includes("VANTA") ? title : `${title} — VANTA`;

  const ogImage = {
    url: image ?? SITE_OG_IMAGE,
    ...OG_SIZE,
    alt: image ? (imageAlt ?? branded) : SITE_OG_ALT,
  };

  return {
    title,
    description: clamped,
    alternates: { canonical: url },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: branded,
      description: clamped,
      url,
      siteName: "VANTA",
      locale: "en_IN",
      type,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: branded,
      description: clamped,
      images: [ogImage.url],
    },
  };
}
