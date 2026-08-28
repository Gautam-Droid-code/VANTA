import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { Providers } from "@/components/Providers";
import { getCustomer } from "@/lib/auth/customerSession";
import { siteUrl } from "@/lib/siteUrl";
import "./globals.css";

export const metadata: Metadata = {
  /**
   * Share previews are built from this. It comes from the environment rather
   * than a literal, because the correct value differs per deployment — and a
   * wrong one here is invisible in testing and broken in production.
   */
  metadataBase: new URL(siteUrl),
  title: {
    default: "VANTA — Technical Streetwear, Made in Mumbai",
    template: "%s | VANTA",
  },
  description:
    "VANTA builds technical streetwear for the Indian street. Shell jackets, cargo pants and utility rigs — COD available, free shipping over ₹1,999.",
  openGraph: {
    title: "VANTA — Technical Streetwear, Made in Mumbai",
    description: "Made to move. Built to stand out.",
    type: "website",
    locale: "en_IN",
    siteName: "VANTA",
    url: siteUrl,
    /* The image itself comes from `app/opengraph-image.tsx`, which Next
       attaches automatically — listing it here as well would give the crawler
       two entries for one picture. */
  },
  /* WhatsApp reads Open Graph, but X and several link previewers look for
     these first and fall back badly without them. */
  twitter: {
    card: "summary_large_image",
    title: "VANTA — Technical Streetwear, Made in Mumbai",
    description: "Made to move. Built to stand out.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  colorScheme: "dark",
};

/**
 * Reading the session here makes every route render at request time.
 *
 * That is the intended trade, and it is worth being explicit about: `cookies()`
 * is a request-time API, so touching it in the root layout opts the whole app
 * out of static prerendering. The storefront wants that anyway — its catalogue
 * and copy come from a content store that `/admin` rewrites at runtime, and a
 * page frozen at build time would keep serving whatever was published the day
 * it was deployed.
 *
 * Only the boolean crosses into the client tree. The customer's name and email
 * stay on the server, where the pages that need them read them directly.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCustomer();

  return (
    <html lang="en-IN" className={fontVariables}>
      <body>
        <Providers signedIn={Boolean(customer)}>{children}</Providers>
      </body>
    </html>
  );
}
