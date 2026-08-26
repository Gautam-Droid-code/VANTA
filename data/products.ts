import type { Product } from "./types";

/**
 * Product catalogue slice used by the homepage rail.
 * Prices are whole rupees; formatting happens at render time.
 */
export const products: Product[] = [
  {
    id: "apex-technical-shell",
    name: "Apex Technical Shell",
    price: 8999,
    compareAtPrice: 11499,
    image: {
      src: "/images/product-shell-jacket.webp",
      alt: "Black technical shell jacket laid flat on a vivid red backdrop",
      width: 896,
      height: 1200,
    },
    backdrop: "red",
    href: "/products/apex-technical-shell",
    codAvailable: true,
    badge: "NEW",
  },
  {
    id: "vector-cargo-pant",
    name: "Vector Cargo Pant",
    price: 5499,
    image: {
      src: "/images/product-cargo-pant.webp",
      alt: "Black technical cargo pants on a vivid orange backdrop",
      width: 896,
      height: 1200,
    },
    backdrop: "orange",
    href: "/products/vector-cargo-pant",
    codAvailable: true,
  },
  {
    id: "series-026-field-parka",
    name: "Series 026 Field Parka",
    price: 12499,
    image: {
      src: "/images/model-02.webp",
      alt: "Model wearing the Series 026 field parka on an orange backdrop",
      width: 848,
      height: 1264,
    },
    backdrop: "orange",
    href: "/products/series-026-field-parka",
    codAvailable: true,
  },
  {
    id: "modular-utility-rig",
    name: "Modular Utility Rig",
    price: 4299,
    image: {
      src: "/images/model-03.webp",
      alt: "Model wearing the modular utility rig over a shell jacket",
      width: 848,
      height: 1264,
    },
    backdrop: "sunset",
    href: "/products/modular-utility-rig",
    codAvailable: true,
    badge: "LOW STOCK",
  },
  {
    id: "tactical-overcoat",
    name: "Tactical Overcoat",
    price: 14999,
    image: {
      src: "/images/model-01.webp",
      alt: "Model wearing the tactical overcoat on a deep red backdrop",
      width: 848,
      height: 1264,
    },
    backdrop: "red",
    href: "/products/tactical-overcoat",
    codAvailable: false,
  },
];

export const productsById: Record<string, Product> = Object.fromEntries(
  products.map((p) => [p.id, p]),
);

export function getProducts(ids: string[]): Product[] {
  return ids.map((id) => productsById[id]).filter(Boolean);
}
