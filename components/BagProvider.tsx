"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

/**
 * The bag.
 *
 * A line stores an id and a quantity — never a name, price or image.
 * Prices change, products get renamed, photographs get replaced. A bag that
 * stored those would keep showing whatever they were on the day it was added,
 * and would quietly bill from a stale number. Everything else is resolved
 * against the live catalogue when the bag is rendered.
 *
 * Guest-only and browser-local. There are no accounts, so there is nobody to
 * attach a server-side bag to, and a cart normally stays on the client until
 * checkout anyway. It also means this keeps working on a read-only host, where
 * the content store does not.
 */
export interface BagLine {
  id: string;
  qty: number;
}

interface BagState {
  lines: BagLine[];
  /** Total number of items, not number of lines — what the badge shows. */
  count: number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  /**
   * Moves a line's quantity by `delta`, relative to what is currently stored.
   *
   * The +/− controls use this rather than `setQty(qty - 1)`. An absolute value
   * has to come from the last render, so two clicks landing in the same tick
   * both compute from the same stale number and the second one does nothing.
   */
  changeQty: (id: string, delta: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  /**
   * Drops lines whose id is not in `validIds`, and reports how many went.
   *
   * The bag stores ids; only a page holding the catalogue can say which of
   * them still exist. This is how that page tells the store.
   */
  pruneTo: (validIds: Set<string>) => void;
  /** How many lines the last prune removed. Zero once nothing is stale. */
  droppedCount: number;
  /**
   * False until the stored bag has been read.
   *
   * The server cannot see localStorage, so the first render must match what
   * the server produced or React replaces the markup and logs a hydration
   * error. Consumers show nothing until this is true rather than flashing a
   * count of zero over the real one.
   */
  hydrated: boolean;
}

const BagContext = createContext<BagState | null>(null);

const STORAGE_KEY = "vanta_bag_v1";
const MAX_QTY = 99;

/** Anything unreadable is treated as an empty bag rather than throwing. */
function parseLines(raw: string | null): BagLine[] {
  try {
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (l): l is BagLine =>
          typeof l === "object" &&
          l !== null &&
          typeof (l as BagLine).id === "string" &&
          Number.isFinite((l as BagLine).qty),
      )
      .map((l) => ({ id: l.id, qty: clampQty(l.qty) }))
      .filter((l) => l.qty > 0);
  } catch {
    return [];
  }
}

const clampQty = (qty: number) => Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));

/**
 * localStorage as an external store.
 *
 * `useSyncExternalStore` rather than reading into state inside an effect: the
 * bag genuinely lives outside React, and this is the API for that. It gives
 * the server snapshot for free (an empty bag, which is all the server can
 * honestly know), so hydration never mismatches, and it makes the cross-tab
 * `storage` event just another source the same subscription listens to.
 */
const listeners = new Set<() => void>();

/**
 * `getSnapshot` must return the same reference until something actually
 * changes, or React re-renders forever. The parsed value is cached against
 * the raw string it came from.
 */
let cachedRaw: string | null = null;
let cachedLines: BagLine[] = [];

const EMPTY: BagLine[] = [];

/**
 * How many lines the last prune dropped.
 *
 * Module state rather than React state so it can be set from the prune itself
 * and read through the same subscription — no update-inside-an-effect, and no
 * ref written during render. It resets naturally: once the stale lines are
 * gone, the next page load prunes nothing and reports zero.
 */
let dropped = 0;

function getSnapshot(): BagLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = parseLines(raw);
  }
  return cachedLines;
}

/** The server has no bag to read, and must not guess at one. */
const getServerSnapshot = (): BagLine[] => EMPTY;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab writing the same key is the same bag changing.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: BagLine[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing, or storage full. Nothing useful to tell the visitor;
    // the in-memory snapshot below still keeps this page view working.
    cachedRaw = null;
    cachedLines = next;
  }
  listeners.forEach((l) => l());
}

export function BagProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  /** True only once the client is driving, so consumers can hold the badge. */
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const add = useCallback((id: string, qty = 1) => {
    const current = getSnapshot();
    const existing = current.find((l) => l.id === id);
    write(
      existing
        ? current.map((l) => (l.id === id ? { ...l, qty: clampQty(l.qty + qty) } : l))
        : [...current, { id, qty: clampQty(qty) }],
    );
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    const next = clampQty(qty);
    const current = getSnapshot();
    // Zero means remove. A zero-quantity line would show an item in the bag
    // that is not in the bag.
    write(
      next === 0
        ? current.filter((l) => l.id !== id)
        : current.map((l) => (l.id === id ? { ...l, qty: next } : l)),
    );
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    const current = getSnapshot();
    const line = current.find((l) => l.id === id);
    if (!line) return;
    const next = clampQty(line.qty + delta);
    write(
      next === 0
        ? current.filter((l) => l.id !== id)
        : current.map((l) => (l.id === id ? { ...l, qty: next } : l)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    write(getSnapshot().filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => {
    dropped = 0;
    write([]);
  }, []);

  const pruneTo = useCallback((validIds: Set<string>) => {
    const current = getSnapshot();
    const kept = current.filter((l) => validIds.has(l.id));
    if (kept.length === current.length) return;
    dropped = current.length - kept.length;
    write(kept);
  }, []);

  const droppedCount = useSyncExternalStore(
    subscribe,
    () => dropped,
    () => 0,
  );

  const count = useMemo(() => lines.reduce((total, l) => total + l.qty, 0), [lines]);

  const value = useMemo(
    () => ({ lines, count, add, setQty, changeQty, remove, clear, hydrated, pruneTo, droppedCount }),
    [lines, count, add, setQty, changeQty, remove, clear, hydrated, pruneTo, droppedCount],
  );

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}

export function useBag(): BagState {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error("useBag must be used inside <BagProvider>");
  return ctx;
}
