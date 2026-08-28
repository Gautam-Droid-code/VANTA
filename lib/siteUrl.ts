/**
 * The site's own address.
 *
 * Share previews — WhatsApp, Instagram, Slack, Google — need absolute URLs.
 * Next builds them from `metadataBase`, so if that is wrong every preview
 * points at a domain that isn't ours and the image silently fails to load.
 *
 * Read from the environment rather than written in the source, because the
 * correct value differs per deployment and nobody should have to edit code to
 * ship to a new domain. Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` on its
 * own, which covers the common case without any configuration at all.
 */
function resolve(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  /**
   * Local development. Deliberately localhost rather than a plausible-looking
   * placeholder domain: a wrong-but-real-looking URL is the failure that ships,
   * because previews look fine in testing and break only in production.
   */
  return "http://localhost:3000";
}

export const siteUrl = resolve();

/** True when nothing has told us the real address yet. */
export const siteUrlIsPlaceholder = siteUrl.startsWith("http://localhost");
