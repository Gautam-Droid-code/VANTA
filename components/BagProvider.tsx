"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface BagState {
  count: number;
  add: (qty?: number) => void;
  clear: () => void;
}

const BagContext = createContext<BagState | null>(null);

/**
 * Minimal client-side bag state so the navbar badge has a real source.
 * Swap the internals for a cart API later — the consumer contract stays.
 */
export function BagProvider({
  children,
  initialCount = 2,
}: {
  children: React.ReactNode;
  initialCount?: number;
}) {
  const [count, setCount] = useState(initialCount);

  const add = useCallback((qty = 1) => setCount((c) => c + qty), []);
  const clear = useCallback(() => setCount(0), []);

  const value = useMemo(() => ({ count, add, clear }), [count, add, clear]);
  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}

export function useBag(): BagState {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error("useBag must be used inside <BagProvider>");
  return ctx;
}
