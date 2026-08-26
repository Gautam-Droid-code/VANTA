import { Archivo } from "next/font/google";

/**
 * Admin headings use Archivo at dashboard weights (600/700), not the
 * storefront's editorial 900. Declared here rather than in `app/fonts.ts` so
 * the extra cuts load only on `/admin` routes and never touch the storefront's
 * critical path — see README, "Stack".
 */
export const adminDisplay = Archivo({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-admin-display",
  display: "swap",
});
