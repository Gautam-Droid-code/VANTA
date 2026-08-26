"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { homepage as publishedHomepage } from "@/data/homepage";
import { products as publishedProducts } from "@/data/products";
import type { HomepageContent, Product } from "@/data/types";

/**
 * ADMIN DATA LAYER — IN-MEMORY ONLY.
 *
 * Seeded from the real `/data` modules so every field, value and type is the
 * genuine schema. Edits are held in React state: the whole editing flow works,
 * but nothing is written anywhere and a reload restores the published values.
 *
 * "Publish" therefore only clears the dirty flag — it does not persist. Wiring
 * this to a real backend is a separate decision; see DECISIONS.md §15.
 */

/** Human labels for the dirty-state banner, keyed by section. */
const SECTION_LABELS: Record<keyof HomepageContent | "products", string> = {
  nav: "Navigation",
  hero: "Hero",
  lookbook: "Lookbook",
  brandStatement: "Brand Statement",
  productRail: "Product Rail",
  trust: "Trust Strip",
  categories: "Categories",
  footer: "Footer",
  products: "Products",
};

interface DraftState {
  content: HomepageContent;
  products: Product[];

  /** Updates one top-level section of the homepage content. */
  updateSection: <K extends keyof HomepageContent>(
    key: K,
    value: HomepageContent[K],
  ) => void;

  upsertProduct: (next: Product) => void;
  removeProduct: (id: string) => void;

  dirtySections: string[];
  isDirty: boolean;
  lastEditedAt: Date | null;
  lastPublishedAt: Date | null;
  publish: () => void;
  discard: () => void;
}

const DraftContext = createContext<DraftState | null>(null);

const clone = <T,>(value: T): T => structuredClone(value);

export function AdminDraftProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<HomepageContent>(() => clone(publishedHomepage));
  const [products, setProducts] = useState<Product[]>(() => clone(publishedProducts));

  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [lastEditedAt, setLastEditedAt] = useState<Date | null>(null);
  const [lastPublishedAt, setLastPublishedAt] = useState<Date | null>(null);

  const touch = useCallback((key: keyof typeof SECTION_LABELS) => {
    setDirty((d) => ({ ...d, [key]: true }));
    setLastEditedAt(new Date());
  }, []);

  const updateSection = useCallback(
    <K extends keyof HomepageContent>(key: K, value: HomepageContent[K]) => {
      setContent((c) => ({ ...c, [key]: value }));
      touch(key);
    },
    [touch],
  );

  const upsertProduct = useCallback(
    (next: Product) => {
      setProducts((list) => {
        const i = list.findIndex((p) => p.id === next.id);
        if (i === -1) return [...list, next];
        const copy = [...list];
        copy[i] = next;
        return copy;
      });
      touch("products");
    },
    [touch],
  );

  const removeProduct = useCallback(
    (id: string) => {
      setProducts((list) => list.filter((p) => p.id !== id));
      // Keep the homepage rail consistent — a removed product can't stay listed.
      setContent((c) => ({
        ...c,
        productRail: {
          ...c.productRail,
          productIds: c.productRail.productIds.filter((pid) => pid !== id),
        },
      }));
      touch("products");
    },
    [touch],
  );

  const publish = useCallback(() => {
    // No persistence in this phase — see the file header.
    setDirty({});
    setLastPublishedAt(new Date());
  }, []);

  const discard = useCallback(() => {
    setContent(clone(publishedHomepage));
    setProducts(clone(publishedProducts));
    setDirty({});
    setLastEditedAt(null);
  }, []);

  const dirtySections = useMemo(
    () =>
      Object.keys(dirty)
        .filter((k) => dirty[k])
        .map((k) => SECTION_LABELS[k as keyof typeof SECTION_LABELS] ?? k),
    [dirty],
  );

  const value = useMemo<DraftState>(
    () => ({
      content,
      products,
      updateSection,
      upsertProduct,
      removeProduct,
      dirtySections,
      isDirty: dirtySections.length > 0,
      lastEditedAt,
      lastPublishedAt,
      publish,
      discard,
    }),
    [
      content,
      products,
      updateSection,
      upsertProduct,
      removeProduct,
      dirtySections,
      lastEditedAt,
      lastPublishedAt,
      publish,
      discard,
    ],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftState {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft must be used inside <AdminDraftProvider>");
  return ctx;
}
