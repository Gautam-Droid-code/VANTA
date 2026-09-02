import { categories } from "./categories";
import type { HomepageContent } from "./types";

/**
 * The single source of truth for everything on the homepage.
 * Swap this object (or serve the same shape from an API) and the page changes
 * with no component edits and no rebuild of the component layer.
 */
export const homepage: HomepageContent = {
  nav: {
    wordmark: "VANTA",
    /**
     * Deliberately short.
     *
     * "Collections" is not here because the bar's own "All categories" control
     * already goes to /collections — two links to one page, side by side, is a
     * choice a visitor has to stop and think about for no gain.
     *
     * "Clothing" and "Accessories" are not here either. They are groups that
     * exist to organise the collection rail; every category they contain is one
     * tap away through "All categories", so listing them in the top bar as well
     * mostly repeats what is underneath it.
     *
     * What is left is the two views that change on their own — new arrivals and
     * whatever is reduced — which is what a returning visitor actually comes
     * back to check.
     */
    links: [
      // Broadest first: everything, then what's new, then what's reduced.
      { label: "All Products", href: "/products" },
      { label: "New Drops", href: "/collections/new" },
      { label: "Sale", href: "/collections/sale" },
    ],
    bottomNav: [
      { id: "home", icon: "home", label: "Home", href: "/" },
      { id: "wishlist", icon: "wishlist", label: "Wishlist", href: "/wishlist" },
      { id: "bag", icon: "bag", label: "Bag", href: "/bag" },
    ],
  },

  hero: {
    headline: [
      [{ text: "MADE " }, { text: "to move.", accent: true }],
      [{ text: "BUILT " }, { text: "to", accent: true }, { text: " STAND OUT." }],
    ],
    description:
      "Engineered for the Indian street. Technical fabrics, uncompromising cuts — built to take the monsoon, the metro and everything after.",
    cta: { label: "Explore Collection", href: "/collections/new" },
    image: {
      src: "/images/model-01.webp",
      alt: "Model in head-to-toe black technical streetwear striding across a deep red studio backdrop",
      width: 848,
      height: 1264,
    },
    backdrop: "red",
  },

  lookbook: {
    slides: [
      {
        id: "look-01",
        image: {
          src: "/images/model-03.webp",
          alt: "Model in a black utility rig and shell jacket against an orange-to-red gradient",
          width: 848,
          height: 1264,
        },
        backdrop: "sunset",
        caption: "Utility Rig 03",
        href: "/collections/new",
      },
      {
        id: "look-02",
        image: {
          src: "/images/model-02.webp",
          alt: "Model in a black field parka against a burnt orange backdrop",
          width: 848,
          height: 1264,
        },
        backdrop: "orange",
        caption: "Field Parka 026",
        href: "/collections/parkas",
      },
      {
        id: "look-03",
        image: {
          src: "/images/model-01.webp",
          alt: "Model in a black tactical overcoat against a deep red backdrop",
          width: 848,
          height: 1264,
        },
        backdrop: "red",
        caption: "Tactical Overcoat",
        href: "/collections/jackets",
      },
    ],
  },

  brandStatement: {
    eyebrow: "Everyday Series 026",
    headline: [[{ text: "OWN YOUR" }], [{ text: "DIRECTION." }]],
    description:
      "Precision tailoring meets relentless durability. Garments designed not just to be worn, but to perform seamlessly in every environment.",
    /**
     * Points at the Series 026 piece itself, not `/collections/series-026`,
     * which never existed — the button was a 404 on the homepage.
     *
     * "Series 026" is a drop rather than a category, and nothing in the
     * catalogue is grouped by it, so there is no collection to send anyone to.
     * If it becomes a real range, make it a category in /admin and repoint
     * this — the button is editable content and needs no code change.
     */
    cta: { label: "Shop Series 026", href: "/products/series-026-field-parka" },
    image: {
      src: "/images/model-02.webp",
      alt: "Model wearing the Series 026 field parka against a burnt orange gradient",
      width: 848,
      height: 1264,
    },
    backdrop: "orange",
  },

  productRail: {
    headline: [[{ text: "BUILT FOR" }], [{ text: "EVERY MOVE" }]],
    viewAll: { label: "View All", href: "/collections/all" },
    productIds: [
      "apex-technical-shell",
      "vector-cargo-pant",
      "series-026-field-parka",
      "modular-utility-rig",
      "tactical-overcoat",
    ],
  },

  trust: {
    items: [
      {
        id: "shipping",
        icon: "shipping",
        title: "Free Shipping",
        detail: "On orders over ₹1,999",
      },
      {
        id: "returns",
        icon: "returns",
        title: "Easy Returns",
        detail: "7-day no-questions returns",
      },
      {
        id: "cod",
        icon: "cod",
        title: "COD Available",
        detail: "Cash on delivery pan-India",
      },
      {
        id: "secure",
        icon: "secure",
        title: "Secure Payments",
        detail: "UPI, cards & net banking",
      },
    ],
  },

  categories: {
    heading: "Categories",
    items: categories,
  },

  footer: {
    wordmark: "VANTA",
    tagline: "Made in Mumbai. Built for everywhere.",
    links: [
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "WhatsApp Support", href: "https://wa.me/918855882679", external: true },
    ],
    copyright: "© 2026 VANTA Studio. All rights reserved.",
  },
};
