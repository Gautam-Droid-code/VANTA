import type { Category } from "./types";

export const categories: Category[] = [
  {
    id: "jackets",
    name: "Jackets",
    href: "/collections/jackets",
    itemCount: 24,
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
    itemCount: 12,
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
    itemCount: 38,
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
    itemCount: 19,
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
    itemCount: 9,
    image: {
      src: "/images/model-01.webp",
      alt: "",
      width: 848,
      height: 1264,
    },
  },
];
