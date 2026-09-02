"use client";

import { useEffect } from "react";

/**
 * The last resort.
 *
 * `app/error.tsx` catches errors inside routes, but it renders *inside* the
 * root layout — so it cannot catch an error thrown by the root layout itself.
 * This can, and it is the only boundary that replaces `<html>` and `<body>`,
 * which is why it has to emit them.
 *
 * That also means **none of the site's CSS or fonts are guaranteed here**: if
 * the root layout failed, the font variables and the stylesheet it attaches may
 * never have been applied. Everything below is therefore inline-styled with
 * literal values rather than Tailwind classes — the one place in this codebase
 * where hard-coded hex is correct, because a class that resolves to nothing
 * would render black text on a white page with no styling at all.
 *
 * The values match the `ink` and `bone` tokens in `tailwind.config.ts`. They
 * are duplicated deliberately and there is nothing to keep in sync: this page
 * is not part of the design system, it is what is left when the design system
 * is gone.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[storefront] root-level error", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "#0D0D0D",
          color: "#F5F5F0",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#8E9192",
          }}
        >
          VANTA
        </p>

        <h1 style={{ margin: 0, fontSize: "clamp(1.75rem, 5vw, 2.5rem)", lineHeight: 1.1 }}>
          Something went badly wrong.
        </h1>

        <p style={{ margin: 0, maxWidth: "38ch", lineHeight: 1.6, color: "#C4C7C7" }}>
          The site failed to load. This has been logged.
        </p>

        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            border: 0,
            borderRadius: "999px",
            padding: "0.875rem 2rem",
            fontSize: "0.8125rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#0D0D0D",
            backgroundColor: "#F5F5F0",
            cursor: "pointer",
          }}
        >
          Reload
        </button>

        {error.digest && (
          <p style={{ marginTop: "1.5rem", fontSize: "0.6875rem", color: "#8E9192" }}>
            Reference {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
