/**
 * The site's own host, resolved the same way `lib/siteUrl.ts` resolves it.
 *
 * Duplicated rather than imported: this file is loaded by the Next CLI before
 * any TypeScript is compiled, so it cannot import the `.ts` module. The two
 * must agree — if the order changes there, change it here.
 */
function siteHost() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return new URL(explicit).host;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return vercel;
  return "localhost:3000";
}

/**
 * Content-Security-Policy.
 *
 * Turnstile needs exactly two extra origins — `script-src` and `frame-src` for
 * `https://challenges.cloudflare.com`. That list is from Cloudflare's CSP
 * reference, not from guesswork:
 * https://developers.cloudflare.com/turnstile/reference/content-security-policy/
 *
 * `script-src` keeps `'unsafe-inline'`, and it is worth being honest about why
 * rather than quietly shipping it. Next's App Router injects an inline
 * bootstrap and inline flight-data chunks on every streamed response. Removing
 * `'unsafe-inline'` means a per-request nonce, which means every page becomes
 * dynamically rendered — the storefront's collection and product pages are
 * statically generated today, and a nonce cannot be baked into a static page
 * because it must differ per response. Trading the whole static-rendering
 * story for a directive that `'strict-dynamic'` would need reworking anyway is
 * not a good trade at this size.
 *
 * `'unsafe-eval'` is NOT here, and neither is a wildcard host. The value of
 * this policy is mostly in `object-src 'none'`, `base-uri 'self'`,
 * `form-action 'self'` and `frame-ancestors 'none'` — the directives that stop
 * an injected `<base>`, a form retargeted to another origin, and clickjacking.
 *
 * Turnstile propagates a nonce to its own dynamically loaded resources and
 * supports `'strict-dynamic'`, so tightening this later is a change to this
 * file plus a nonce in middleware, not a redesign.
 */
/**
 * Development needs two relaxations, and neither reaches production.
 *
 * React's development build uses `eval()` to reconstruct stack traces across
 * environments, so a CSP without `'unsafe-eval'` breaks `next dev` outright —
 * observed as "eval() is not supported in this environment" and a page that
 * will not hydrate. React never uses eval in production, so the allowance is
 * gated rather than global.
 *
 * `upgrade-insecure-requests` rewrites every http:// request to https://.
 * Locally the dev server speaks plain HTTP, so shipping it in development
 * turns every same-origin fetch into ERR_SSL_PROTOCOL_ERROR — also observed,
 * rather than reasoned about. It belongs only where there is TLS to upgrade to.
 */
const isDev = process.env.NODE_ENV === "development";

/**
 * Razorpay's hosted checkout.
 *
 * `checkout.razorpay.com` serves the script; it then loads an iframe from
 * `api.razorpay.com` and talks to both, plus `lumberjack.razorpay.com` for its
 * own telemetry. Listed explicitly rather than as `*.razorpay.com`: a wildcard
 * would also admit anything else they ever host on that domain.
 *
 * Their checkout renders payment-method logos and bank icons from
 * `cdn.razorpay.com`, hence the `img-src` entry below.
 */
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com";
const RAZORPAY_FRAME = "https://api.razorpay.com https://checkout.razorpay.com";
const RAZORPAY_CONNECT =
  "https://api.razorpay.com https://lumberjack.razorpay.com https://checkout.razorpay.com";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com ${RAZORPAY_SCRIPT}`,
  `frame-src 'self' https://challenges.cloudflare.com ${RAZORPAY_FRAME}`,
  // `ws:` for the dev server's hot-reload socket, which is same-origin but not
  // http(s) — `connect-src 'self'` alone does not cover a WebSocket scheme.
  `connect-src 'self' https://challenges.cloudflare.com ${RAZORPAY_CONNECT}${isDev ? " ws: wss:" : ""}`,
  // Tailwind and next/font both emit inline styles; there is no nonce-free
  // alternative, and injected CSS is a far smaller problem than injected JS.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // `data:` and `blob:` are for next/image's own placeholder and optimiser.
  "img-src 'self' data: blob: https://cdn.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  // Razorpay's checkout falls back to submitting a real form to their own
  // domain when it cannot use its iframe — a bank's 3-D Secure page, mostly.
  // Without this the payment silently dies at exactly that step.
  `form-action 'self' ${RAZORPAY_FRAME}`,
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  /**
   * Two years, with subdomains and preload. Only meaningful over HTTPS, and
   * ignored by browsers on plain HTTP, so it is safe to send in development.
   */
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  /** Send the full URL to ourselves, only the origin to anyone else. */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /** `frame-ancestors` above supersedes this; kept for older browsers. */
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    /**
     * Server Actions only accept calls whose Origin is one of these.
     *
     * Next already checks Origin against Host, which stops the ordinary
     * cross-site case. This pins it to known hosts as well, so a proxy or a
     * misconfigured rewrite that presents a different Host cannot turn every
     * action into a cross-origin endpoint.
     */
    serverActions: {
      /**
       * Photo uploads go through a Server Action, and the default body limit is
       * 1 MB — well under the 12 MB `lib/mediaLimits.ts` advertises. Any photo
       * from a phone exceeded it, and the failure was a Next runtime error
       * rather than the friendly message the upload path already has, because
       * the request died in transport before any of that code ran.
       *
       * 16 MB, not 12: multipart framing and the action's own payload ride
       * along with the file, so a limit set exactly at the file size rejects
       * a file that is exactly at the file size.
       *
       * Must stay above MAX_UPLOAD_BYTES. The real check is server-side in
       * `processUpload`, which decodes the image rather than trusting a
       * declared length; this only has to be loose enough to let a legitimate
       * upload arrive and be judged.
       */
      bodySizeLimit: "16mb",
      allowedOrigins: [
        siteHost(),
        "localhost:3000",
        // Vercel gives every deployment its own hostname; without this, actions
        // fail on preview URLs while working in production.
        ...(process.env.VERCEL_URL ? [process.env.VERCEL_URL] : []),
      ],
    },
  },

  async headers() {
    return [
      {
        // Everything. A header set only on pages leaves API routes, images and
        // the media route uncovered.
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        /**
         * `/admin` is noindex at the header level, not only in page metadata.
         *
         * A `<meta>` tag is only read if the crawler renders the page — and
         * every admin URL redirects to a login screen before rendering
         * anything, so the tag a crawler would need to see is on a page it
         * never reaches. The header is on the redirect too.
         */
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          // Nothing under /admin should ever be held by a shared cache.
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      {
        source: "/admin",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      /**
       * The homepage section editors moved under /admin/pages/homepage when
       * "Pages" became a group in its own right. Kept so an open tab or a
       * bookmark lands on the editor rather than a 404.
       */
      {
        source: "/admin/sections/:section",
        destination: "/admin/pages/homepage/:section",
        permanent: false,
      },
      { source: "/admin/sections", destination: "/admin/pages/homepage", permanent: false },
      /**
       * "Everything" moved to /products, which is the URL people try — every
       * product link is /products/<slug>, and trimming one is a habit. Two
       * live URLs listing the same 45 products would be duplicate content, so
       * the old one redirects rather than staying as a second front door.
       *
       * Not permanent: the view still exists in the content model and could be
       * given its own page again, and a 301 is cached by browsers for a very
       * long time.
       */
      { source: "/collections/all", destination: "/products", permanent: false },
    ];
  },
};

export default nextConfig;
