import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { siteUrl, siteUrlIsPlaceholder } from "@/lib/siteUrl";

export interface Crumb {
  name: string;
  /** Absent on the final crumb — you do not link to the page you are on. */
  href?: string;
}

/**
 * The "you are here" trail, and its `BreadcrumbList` structured data.
 *
 * **Both come from the same array, and that is the entire point.** Google's
 * structured-data guidelines require breadcrumb markup to match the breadcrumb
 * a person sees; a mismatch is a guideline violation, not a cosmetic bug. The
 * product and collection pages previously hand-rolled their own trail markup,
 * which meant adding JSON-LD would have created two independent descriptions of
 * one trail and a standing invitation for them to diverge. One `trail` prop
 * renders both, so they cannot.
 *
 * Marked up as an ordered list rather than the loose spans it replaces: the
 * order is the meaning, and `<ol>` is what tells a screen reader "item 2 of 3"
 * instead of reading a run of unrelated links.
 */
export function Breadcrumbs({ trail, className }: { trail: Crumb[]; className?: string }) {
  if (trail.length === 0) return null;

  /**
   * JSON-LD is omitted when the site URL is a placeholder, for the same reason
   * `app/robots.ts` refuses to emit a sitemap line: `BreadcrumbList` items must
   * be absolute URLs, and publishing `http://localhost:3000/...` as a machine
   * -readable claim about where these pages live is worse than publishing
   * nothing. The visible trail is unaffected.
   */
  const structured = siteUrlIsPlaceholder
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          // The last crumb has no `item`, which is what the spec asks for: it
          // is the current page and linking to itself says nothing.
          ...(crumb.href ? { item: `${siteUrl}${crumb.href}` } : {}),
        })),
      };

  return (
    <>
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="eyebrow flex flex-wrap items-center">
          {trail.map((crumb, index) => (
            <li key={`${crumb.name}-${index}`} className="flex items-center">
              {index > 0 && (
                <span aria-hidden className="px-2">
                  /
                </span>
              )}
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors hover:text-bone">
                  {crumb.name}
                </Link>
              ) : (
                /* `aria-current` marks the page you are on, so a screen reader
                   announces it as the destination rather than one more link. */
                <span aria-current="page" className="text-bone-dim">
                  {crumb.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {structured && <JsonLd data={structured} />}
    </>
  );
}
