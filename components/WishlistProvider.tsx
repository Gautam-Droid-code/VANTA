"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { createPersistentStore } from "@/lib/persistentStore";

/**
 * The wishlist.
 *
 * A list of product ids, newest first. No quantities — wanting a thing twice
 * is not a state a wishlist has — and no names or prices, for the same reason
 * the bag stores none: they change, and a saved copy would show whatever they
 * were on the day the item was saved. Products are resolved against the live
 * catalogue wherever the list is rendered.
 *
 * Browser-local, on the same store as the bag. See `lib/persistentStore.ts`.
 */
interface WishlistState {
  ids: string[];
  count: number;
  has: (id: string) => boolean;
  /** Adds when absent, removes when present — one control, one meaning. */
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Drops ids no longer in the catalogue; returns nothing, reports via `droppedCount`. */
  pruneTo: (validIds: Set<string>) => void;
  droppedCount: number;
  /** False until the stored list has been read; consumers hold their UI. */
  hydrated: boolean;
}

const WishlistContext = createContext<WishlistState | null>(null);

const STORAGE_KEY = "vanta_wishlist_v1";

/** Anything unreadable is treated as an empty list rather than throwing. */
function parseIds(raw: string | null): string[] {
  try {
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
    // Duplicates would render the same product twice; the list is a set.
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

let dropped = 0;

/** Exported for `components/AccountSync.tsx`; see the bag for the reasoning. */
export const wishlistStore = createPersistentStore<string[]>({
  key: STORAGE_KEY,
  empty: [],
  parse: parseIds,
});

const { subscribe, getSnapshot, getServerSnapshot, write } = wishlistStore;

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const droppedCount = useSyncExternalStore(
    subscribe,
    () => dropped,
    () => 0,
  );

  const toggle = useCallback((id: string) => {
    const current = getSnapshot();
    // Newest first, so a freshly saved item is at the top of the page.
    write(current.includes(id) ? current.filter((x) => x !== id) : [id, ...current]);
  }, []);

  const remove = useCallback((id: string) => {
    write(getSnapshot().filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => {
    dropped = 0;
    write([]);
  }, []);

  const pruneTo = useCallback((validIds: Set<string>) => {
    const current = getSnapshot();
    const kept = current.filter((id) => validIds.has(id));
    if (kept.length === current.length) return;
    dropped = current.length - kept.length;
    write(kept);
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const value = useMemo(
    () => ({ ids, count: ids.length, has, toggle, remove, clear, pruneTo, droppedCount, hydrated }),
    [ids, has, toggle, remove, clear, pruneTo, droppedCount, hydrated],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistState {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
