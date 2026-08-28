import { ImageResponse } from "next/og";

/**
 * The picture that appears when someone shares a VANTA link.
 *
 * Generated rather than stored as a file, so it cannot drift out of step with
 * the brand and there is no asset to remember to update. Being a route also
 * means it is always exactly the right dimensions, which is what stops the
 * preview being cropped or rejected.
 *
 * Deliberately built from CSS alone — no font files, no images. A share image
 * that fails to generate is worse than a plain one, and every extra dependency
 * here is another way for the build to break over something nobody looks at.
 */
export const alt = "VANTA — Technical Streetwear, Made in Mumbai";

/** The size every platform expects. Anything else gets cropped. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0D0D0D",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* The brand's own red flare, as a corner glow rather than a panel. */}
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -160,
            width: 760,
            height: 760,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(224,20,20,0.55) 0%, rgba(196,30,30,0.18) 45%, rgba(13,13,13,0) 70%)",
          }}
        />

        <div
          style={{
            fontSize: 128,
            fontWeight: 900,
            color: "#F5F5F0",
            letterSpacing: 28,
            lineHeight: 1,
            display: "flex",
          }}
        >
          VANTA
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 40,
            color: "rgba(245,245,240,0.72)",
            lineHeight: 1.25,
            maxWidth: 820,
            display: "flex",
          }}
        >
          Made to move. Built to stand out.
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "rgba(245,245,240,0.45)",
            display: "flex",
          }}
        >
          Technical streetwear &middot; Mumbai
        </div>
      </div>
    ),
    size,
  );
}
