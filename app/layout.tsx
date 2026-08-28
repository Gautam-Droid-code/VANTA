import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { Providers } from "@/components/Providers";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={fontVariables}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
