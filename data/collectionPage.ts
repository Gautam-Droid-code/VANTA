import type { CollectionPageContent } from "./types";

/**
 * Defaults for the collection pages.
 *
 * These are the strings that used to be hardcoded across
 * `app/collections/*` and `lib/catalogue.ts`. Moving them here is what makes
 * the pages editable — the components now render whatever this holds.
 */
export const collectionPage: CollectionPageContent = {
  indexHeading: "Collections",
  indexIntro: "Every range, built for the same conditions.",
  emptyMessage: "Nothing in this collection yet.",
  emptyCtaLabel: "Browse everything",
  showCount: true,
  viewNames: {
    all: "Everything",
    new: "New Drops",
    sale: "Sale",
  },
};
