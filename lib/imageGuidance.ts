/**
 * What shape a photo should be, per place it appears.
 *
 * The storefront crops with `object-cover`, so a photo of the wrong shape is
 * never broken — it is silently cropped, usually through the subject. Someone
 * choosing an image has no way to know which edges will survive unless they
 * are told, so every picker states the ratio it is about to crop to.
 *
 * `recommended` is roughly 2x the largest rendered width, which is what a
 * high-density screen asks for. Uploads are capped at 2400px on the longest
 * edge (`lib/processUpload.ts`), so nothing here exceeds that.
 */
export interface ImageGuidance {
  /** Human ratio, e.g. "4:5". */
  ratio: string;
  /** Ideal pixel size to upload. */
  recommended: string;
  /** Where it appears and what gets cropped. */
  note: string;
}

export const imageGuidance = {
  hero: {
    ratio: "4:5 (portrait)",
    recommended: "1200 × 1500px",
    note: "Fills the top of the homepage. Wider screens crop the top and bottom, so keep the subject centred.",
  },
  lookbook: {
    ratio: "3:4 (portrait)",
    recommended: "1200 × 1600px",
    note: "One slide in the homepage lookbook carousel.",
  },
  brandStatement: {
    ratio: "3:4 (portrait)",
    recommended: "1200 × 1600px",
    note: "Sits beside the brand statement copy further down the homepage.",
  },
  product: {
    ratio: "3:4 (portrait)",
    recommended: "1200 × 1600px",
    note: "Used on product cards and the product page. The same shape everywhere, so a whole grid lines up.",
  },
  category: {
    ratio: "3:4 (portrait)",
    recommended: "1200 × 1600px",
    note: "Revealed behind the category row on the homepage when someone hovers or taps it.",
  },
  collectionBanner: {
    ratio: "3:1 (wide)",
    recommended: "2400 × 800px",
    note: "Wide strip above the products on a collection page. Very short — anything important must sit in the middle band.",
  },
} as const satisfies Record<string, ImageGuidance>;

export type ImageSlot = keyof typeof imageGuidance;
