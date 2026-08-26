"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { publishContent } from "@/app/admin/actions";
import type { SiteContent } from "@/lib/contentStore";
import type { HomepageContent, Product } from "@/data/types";

/**
 * ADMIN DATA LAYER.
 *
 * Drafts are held in React state; publishing writes them through
 * `publishContent` to the content store, which is what the storefront reads.
 *
 * The published baseline arrives as a prop from a server component that read
 * the store — this provider no longer imports `/data`. Those modules are the
 * store's seed, not its contents, so importing them here would make the admin
 * show the original copy again the moment anything was published.
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
  /** True while a publish is in flight — buttons disable against double-submits. */
  isPublishing: boolean;
  /** Set when the last publish failed; cleared when another one starts. */
  publishError: string | null;
}

const DraftContext = createContext<DraftState | null>(null);

const clone = <T,>(value: T): T => structuredClone(value);

export function AdminDraftProvider({
  initial,
  children,
}: {
  /** The published content, read from the store on the server. */
  initial: SiteContent;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [content, setContent] = useState<HomepageContent>(() => clone(initial.homepage));
  const [products, setProducts] = useState<Product[]>(() => clone(initial.products));

  /**
   * The last successfully published state, which is what "Discard" returns to.
   * A ref, not state: it is only read inside callbacks, and re-rendering the
   * whole admin because the baseline moved would serve no purpose.
   */
  const baseline = useRef<SiteContent>(clone(initial));

  const [isPublishing, startPublishing] = useTransition();
  const [publishError, setPublishError] = useState<string | null>(null);

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
    setPublishError(null);
    startPublishing(async () => {
      const next: SiteContent = { homepage: content, products };
      const result = await publishContent(next);

      if (!result.ok) {
        // The draft is left exactly as it was: a failed publish must never
        // look like a successful one, and the editor should not lose work.
        setPublishError(result.error);
        return;
      }

      baseline.current = clone(next);
      setDirty({});
      setLastPublishedAt(result.publishedAt ? new Date(result.publishedAt) : new Date());
      // Pull the server components back down so previews reflect what is live.
      router.refresh();
    });
  }, [content, products, router]);

  const discard = useCallback(() => {
    // Back to the last published state, not to `/data` — after a publish those
    // are different things, and resetting to the seed would silently revert
    // work that is already live.
    setContent(clone(baseline.current.homepage));
    setProducts(clone(baseline.current.products));
    setDirty({});
    setLastEditedAt(null);
    setPublishError(null);
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
      isPublishing,
      publishError,
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
      isPublishing,
      publishError,
    ],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftState {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft must be used inside <AdminDraftProvider>");
  return ctx;
}
