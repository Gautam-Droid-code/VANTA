import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vanta.example"),
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
