import type { Category } from "./types";

/**
 * `itemCount` mirrors how many products carry each `categoryId`. It is stored
 * rather than derived because the homepage rows render without loading the
 * catalogue — but that means it has to be updated when products are added.
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
    itemCount: 0,
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
    itemCount: 0,
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
    itemCount: 12,
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
    itemCount: 8,
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
    itemCount: 10,
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
    itemCount: 8,
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
    itemCount: 7,
    image: {
      src: "/images/model-01.webp",
      alt: "",
      width: 848,
      height: 1264,
    },
  },
];
