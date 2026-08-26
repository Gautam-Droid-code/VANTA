import { Archivo, Inter, Playfair_Display } from "next/font/google";

/**
 * Display: heavy grotesk for headlines. Only 900 is ever rendered — the
 * `.headline` class pairs `font-display` with `font-black`, and the navbar
 * wordmark does the same. Keep this list at exactly what's used; every extra
 * weight is another @font-face and another preload.
 */
export const display = Archivo({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-display",
  display: "swap",
});

/**
 * Accent: italic serif, injected into headlines for single words.
 * `.headline em` renders it at `font-normal`, so 400 italic is all we need.
 */
export const accent = Playfair_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-accent",
  display: "swap",
});

/** Body / UI. */
export const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const fontVariables = `${display.variable} ${accent.variable} ${body.variable}`;
