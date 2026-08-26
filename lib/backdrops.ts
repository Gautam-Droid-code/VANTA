import type { Backdrop } from "@/data/types";

/**
 * Maps a content-layer backdrop *intent* to actual styling.
 * The data layer never knows about Tailwind — it just names a mood.
 */
export const backdropClass: Record<Backdrop, string> = {
  red: "bg-flare-red",
  orange: "bg-flare-orange",
  sunset: "bg-flare-sunset",
  graphite: "bg-gradient-to-b from-ink-line to-ink-soft",
};
