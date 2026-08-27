/**
 * Checking link addresses typed by a person, not by a developer.
 *
 * The failure this exists to stop is real and was live on the site: the "Link"
 * box is pre-filled with "/", someone pastes an address after it, and it saves
 * as "/https:example.com". That is a perfectly valid internal path,
 * so nothing rejected it — it simply pointed at a page on our own site that
 * does not exist, and only ever announced itself as a 404 to visitors.
 *
 * Deliberately advisory, not corrective. Rewriting what someone typed while
 * they are typing it is worse than telling them what looks wrong: they may be
 * mid-paste, and a field that edits itself is impossible to trust.
 */

export type HrefProblem = {
  /** Shown under the field. Written for the person editing, not a developer. */
  message: string;
  /** The address this probably should have been, when that is obvious. */
  suggestion?: string;
};

/** Looks like "example.com" or "sub.example.co.in", with no scheme in front. */
const BARE_DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i;
/** A scheme that has ended up inside a path: "/https:..." or "/http://...". */
const SCHEME_IN_PATH = /^\/+(https?):\/*(.*)$/i;

export function checkHref(href: string, external?: boolean): HrefProblem | null {
  const value = href.trim();

  if (!value) return { message: "Add a link address, or remove this link." };

  // The exact bug above: a full web address pasted after the leading "/".
  const buried = value.match(SCHEME_IN_PATH);
  if (buried) {
    return {
      message:
        "This looks like a website address that ended up inside a page path, so it will open a “page not found”.",
      suggestion: `${buried[1].toLowerCase()}://${buried[2]}`,
    };
  }

  if (external) {
    if (BARE_DOMAIN.test(value)) {
      return {
        message: "External links need the full address, starting with https://.",
        suggestion: `https://${value}`,
      };
    }
    if (value.startsWith("/")) {
      return {
        message:
          "This is a page on this site, but it is marked as opening outside it. Either use the full https:// address, or turn off “Opens outside the site”.",
      };
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return { message: "External links must start with https:// or http://." };
      }
    } catch {
      return { message: "That is not a complete web address." };
    }
    return null;
  }

  // Internal from here on.
  if (BARE_DOMAIN.test(value)) {
    return {
      message:
        "This looks like another website. Turn on “Opens outside the site” and use the full https:// address.",
      suggestion: `https://${value}`,
    };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return {
      message:
        "This is an external address, so turn on “Opens outside the site”.",
    };
  }
  if (!value.startsWith("/")) {
    return {
      message: "Links to pages on this site start with a slash, like /collections/new.",
      suggestion: `/${value}`,
    };
  }

  return null;
}

/**
 * The narrow subset worth refusing at publish time.
 *
 * Only the unambiguously-broken case — a scheme buried in a path — is blocked.
 * The editor warns about the rest, but "/collections/new" is indistinguishable
 * from any other internal path that does not exist yet, and this project has
 * plenty of those on purpose.
 */
export function isBrokenHref(href: string): boolean {
  return SCHEME_IN_PATH.test(href.trim());
}
