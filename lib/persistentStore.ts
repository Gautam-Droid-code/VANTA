/**
 * A browser-local store that React can subscribe to.
 *
 * Shared by the bag and the wishlist, which differ only in what they hold —
 * the storage mechanics underneath are identical, and were worth writing once.
 *
 * Built for `useSyncExternalStore` rather than for reading into state inside an
 * effect. Both of these genuinely live outside React, and that is the API for
 * it: the server snapshot comes for free (always empty, which is all the server
 * can honestly know about a browser's storage), so hydration never mismatches,
 * and the cross-tab `storage` event is just another source on the same
 * subscription — two tabs are one list.
 */
export interface PersistentStore<T> {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  write: (next: T) => void;
}

export function createPersistentStore<T>({
  key,
  empty,
  parse,
}: {
  key: string;
  /** Returned before hydration, on a read failure, and for absent data. */
  empty: T;
  /** Turns stored text into a value. Must never throw — return `empty`. */
  parse: (raw: string | null) => T;
}): PersistentStore<T> {
  const listeners = new Set<() => void>();

  /**
   * `getSnapshot` must return the same reference until something actually
   * changes, or React re-renders forever. The parsed value is cached against
   * the exact string it was parsed from.
   */
  let cachedRaw: string | null = null;
  let cachedValue: T = empty;
  let cacheValid = false;

  const getSnapshot = (): T => {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      // Storage blocked entirely. Whatever is in memory is the best answer.
      return cacheValid ? cachedValue : empty;
    }
    if (!cacheValid || raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue = parse(raw);
      cacheValid = true;
    }
    return cachedValue;
  };

  const subscribe = (onChange: () => void): (() => void) => {
    listeners.add(onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) onChange();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener("storage", onStorage);
    };
  };

  const write = (next: T): void => {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /**
       * Private browsing, or storage full. The value is kept in the cache so
       * this page view still behaves correctly — it simply will not survive a
       * reload. There is nothing useful to tell the visitor about that.
       */
      cachedRaw = null;
      cachedValue = next;
      cacheValid = true;
    }
    listeners.forEach((l) => l());
  };

  return { subscribe, getSnapshot, getServerSnapshot: () => empty, write };
}
