import type { Category } from "./types";

/**
 * `itemCount` mirrors how many products carry each `categoryId`. It is stored
 * rather than derived because the homepage rows render without loading the
 * catalogue — but that means it has to be updated when products are added.
 */

export const categories: Category[] = [
  {
    id: "jackets",
    name: "Jackets",
    href: "/collections/jackets",
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
    itemCount: 7,
    image: {
      src: "/images/model-01.webp",
      alt: "",
      width: 848,
      height: 1264,
    },
  },
];
