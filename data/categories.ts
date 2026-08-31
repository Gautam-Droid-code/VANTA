import type { Category } from "./types";

/**
 * Categories carry **no product count**.
 *
 * There used to be a stored `itemCount` here, justified as "the homepage rows
 * render without loading the catalogue". That was not true — `app/page.tsx` is
 * a server component and already reads the whole content store, products
 * included — so the field bought nothing and cost accuracy. Every one of the
 * seven values had drifted: the homepage row read "TOPS — 38 ITEMS" and the
 * page behind it said "10 pieces".
 *
 * Counts come from `withProductCounts` in `lib/catalogue.ts` now. DECISIONS §30.
 */

export const categories: Category[] = [
  /**
   * Groups. These hold no products of their own — their collection page shows
   * everything in their children — so they never appear in the homepage rows,
   * which list only categories a product can actually be in.
   */
  {
    id: "clothing",
    name: "Clothing",
    href: "/collections/clothing",
    image: {
      src: "/images/product-shell-jacket.webp",
      alt: "",
      width: 896,
      height: 1200,
    },
  },
  {
    id: "accessories",
    name: "Accessories",
    href: "/collections/accessories",
    image: {
      src: "/images/model-01.webp",
      alt: "",
      width: 848,
      height: 1264,
    },
  },
  {
    id: "jackets",
    name: "Jackets",
    href: "/collections/jackets",
    parentId: "clothing",
    image: {
      src: "/images/product-shell-jacket.webp",
      alt: "",
      width: 896,
      height: 1200,
    },
  },
  {
    id: "parkas",
    name: "Parkas",
    href: "/collections/parkas",
    parentId: "clothing",
    image: {
      src: "/images/model-02.webp",
      alt: "",
      width: 848,
      height: 1264,
    },
  },
  {
    id: "tops",
    name: "Tops",
    href: "/collections/tops",
    parentId: "clothing",
    image: {
      src: "/images/model-03.webp",
      alt: "",
      width: 848,
      height: 1264,
    },
  },
  {
    id: "pants",
    name: "Pants",
    href: "/collections/pants",
    parentId: "clothing",
    image: {
      src: "/images/product-cargo-pant.webp",
      alt: "",
      width: 896,
      height: 1200,
    },
  },
  {
    id: "bags",
    name: "Bags",
    href: "/collections/bags",
    parentId: "accessories",
    image: {
      src: "/images/model-01.webp",
      alt: "",
      width: 848,
      height: 1264,
    },
  },
];
