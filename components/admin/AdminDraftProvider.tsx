"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { discardDraft, publishContent, saveDraft } from "@/app/admin/actions";
import type { DraftRecord, SiteContent } from "@/lib/contentStore";
import type { MediaItem } from "@/lib/mediaStore";
import type { CollectionPageContent, HomepageContent, Product } from "@/data/types";

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
const SECTION_LABELS: Record<keyof HomepageContent | "products" | "collectionPage", string> = {
  collectionPage: "Collection Pages",
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
  /** Shared settings for the collection pages. */
  collectionPage: CollectionPageContent;
  updateCollectionPage: (value: CollectionPageContent) => void;
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

  /**
   * The uploaded photo library. Unlike content, media is NOT draft state —
   * an upload is written immediately and is live whether or not you publish.
   * Deferring it would mean holding file bytes in browser memory until publish,
   * and a draft that references an image nobody else can see yet.
   */
  media: MediaItem[];
  addMedia: (item: MediaItem) => void;
  dropMedia: (id: string) => void;

  /** "saving" while a draft write is in flight, "error" if the last one failed. */
  draftStatus: "idle" | "saving" | "saved" | "error";
  /** When the draft was last written to the server. */
  draftSavedAt: Date | null;
  /** Force a save now, rather than waiting for the debounce. */
  saveDraftNow: () => void;
  /** True when this session restored a draft left from an earlier one. */
  restoredDraft: boolean;
}

const DraftContext = createContext<DraftState | null>(null);

const clone = <T,>(value: T): T => structuredClone(value);

export function AdminDraftProvider({
  initial,
  initialMedia,
  initialDraft,
  children,
}: {
  /** The published content, read from the store on the server. */
  initial: SiteContent;
  /** The uploaded photo library, read from the media store on the server. */
  initialMedia: MediaItem[];
  /** A draft left over from an earlier session, if there is one. */
  initialDraft: DraftRecord | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  /**
   * A leftover draft wins over published content as the starting state. That is
   * the whole point of saving one: the editor comes back to what they were
   * working on, not to what the site currently shows. `baseline` still tracks
   * the published values, so Discard has somewhere real to go back to.
   */
  const [content, setContent] = useState<HomepageContent>(() =>
    clone(initialDraft ? initialDraft.content.homepage : initial.homepage),
  );
  const [products, setProducts] = useState<Product[]>(() =>
    clone(initialDraft ? initialDraft.content.products : initial.products),
  );
  const [collectionPage, setCollectionPage] = useState<CollectionPageContent>(() =>
    clone(initialDraft ? initialDraft.content.collectionPage : initial.collectionPage),
  );

  /**
   * The last successfully published state, which is what "Discard" returns to.
   * A ref, not state: it is only read inside callbacks, and re-rendering the
   * whole admin because the baseline moved would serve no purpose.
   */
  const baseline = useRef<SiteContent>(clone(initial));

  const [isPublishing, startPublishing] = useTransition();
  const [publishError, setPublishError] = useState<string | null>(null);

  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  // Newest first, matching the store's own ordering.
  const addMedia = useCallback((item: MediaItem) => setMedia((m) => [item, ...m]), []);
  const dropMedia = useCallback(
    (id: string) => setMedia((m) => m.filter((x) => x.id !== id)),
    [],
  );

  const [draftStatus, setDraftStatus] = useState<DraftState["draftStatus"]>("idle");
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(
    initialDraft ? new Date(initialDraft.savedAt) : null,
  );
  const [restoredDraft, setRestoredDraft] = useState(initialDraft !== null);

  /**
   * A restored draft is already different from what's published, so the
   * unpublished-changes bar has to be showing when the page opens — otherwise
   * there'd be no way to publish or discard it.
   */
  const [dirty, setDirty] = useState<Record<string, boolean>>(() => {
    if (!initialDraft) return {};
    const marked: Record<string, boolean> = {};
    /**
     * Three places a section can live: the products array, the shared
     * collection-page settings, or a key of the homepage. Resolved here rather
     * than indexed blindly, so adding another top-level section is a compile
     * error until it is handled instead of a silently missing dirty flag.
     */
    const pick = (c: SiteContent, key: keyof typeof SECTION_LABELS): unknown => {
      if (key === "products") return c.products;
      if (key === "collectionPage") return c.collectionPage;
      return c.homepage[key];
    };

    (Object.keys(SECTION_LABELS) as Array<keyof typeof SECTION_LABELS>).forEach((key) => {
      if (JSON.stringify(pick(initial, key)) !== JSON.stringify(pick(initialDraft.content, key))) {
        marked[key] = true;
      }
    });
    return marked;
  });
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

  const updateCollectionPage = useCallback(
    (value: CollectionPageContent) => {
      setCollectionPage(value);
      touch("collectionPage");
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

  /**
   * AUTOSAVE.
   *
   * Keyed off `isDirty` rather than firing on mount, so simply opening the
   * admin never writes a draft — only an actual edit does.
   *
   * Debounced: a text field fires on every keystroke, and one request per
   * character would be pointless traffic and a race between responses. One
   * second after typing stops is soon enough that almost nothing is at risk,
   * and rare enough to stay cheap.
   *
   */
  const dirtyKeys = Object.keys(dirty).filter((k) => dirty[k]);
  const hasChanges = dirtyKeys.length > 0;

  const writeDraft = useCallback(async (payload: SiteContent) => {
    setDraftStatus("saving");
    const result = await saveDraft(payload);
    if (!result.ok) {
      setDraftStatus("error");
      return;
    }
    setDraftStatus("saved");
    setDraftSavedAt(result.savedAt ? new Date(result.savedAt) : new Date());
  }, []);

  useEffect(() => {
    if (!hasChanges) return;
    const timer = setTimeout(() => {
      void writeDraft({ homepage: content, collectionPage, products });
    }, 1000);
    return () => clearTimeout(timer);
    // `content`/`products` are the trigger: any edit restarts the timer.
  }, [content, collectionPage, products, hasChanges, writeDraft]);

  const saveDraftNow = useCallback(() => {
    void writeDraft({ homepage: content, collectionPage, products });
  }, [content, collectionPage, products, writeDraft]);

  /**
   * Last line of defence. Autosave covers everything except the second between
   * the final keystroke and the debounce firing — closing the tab in that
   * window would still lose it. This asks the browser to confirm, and only
   * while there is genuinely unsaved work.
   */
  useEffect(() => {
    const unsaved = hasChanges && draftStatus !== "saved";
    if (!unsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasChanges, draftStatus]);

  const publish = useCallback(() => {
    setPublishError(null);
    startPublishing(async () => {
      const next: SiteContent = { homepage: content, collectionPage, products };
      const result = await publishContent(next);

      if (!result.ok) {
        // The draft is left exactly as it was: a failed publish must never
        // look like a successful one, and the editor should not lose work.
        setPublishError(result.error);
        return;
      }

      baseline.current = clone(next);
      setDirty({});
      setDraftStatus("idle");
      setDraftSavedAt(null);
      setRestoredDraft(false);
      setLastPublishedAt(result.publishedAt ? new Date(result.publishedAt) : new Date());
      // Pull the server components back down so previews reflect what is live.
      router.refresh();
    });
  }, [content, collectionPage, products, router]);

  const discard = useCallback(() => {
    // Back to the last published state, not to `/data` — after a publish those
    // are different things, and resetting to the seed would silently revert
    // work that is already live.
    setContent(clone(baseline.current.homepage));
    setProducts(clone(baseline.current.products));
    setCollectionPage(clone(baseline.current.collectionPage));
    setDirty({});
    setLastEditedAt(null);
    setPublishError(null);
    setDraftStatus("idle");
    setDraftSavedAt(null);
    setRestoredDraft(false);
    // Discard has to reach the server too. Clearing only local state would
    // leave the saved draft behind, and the next page load would restore the
    // very changes that were just thrown away.
    void discardDraft();
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
      collectionPage,
      updateCollectionPage,
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
      media,
      addMedia,
      dropMedia,
      draftStatus,
      draftSavedAt,
      saveDraftNow,
      restoredDraft,
    }),
    [
      content,
      collectionPage,
      updateCollectionPage,
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
      media,
      addMedia,
      dropMedia,
      draftStatus,
      draftSavedAt,
      saveDraftNow,
      restoredDraft,
    ],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftState {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft must be used inside <AdminDraftProvider>");
  return ctx;
}
