"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/data/types";
import { backdropClass } from "@/lib/backdrops";
import { formatINR } from "@/lib/format";
import { useDraft } from "@/components/admin/AdminDraftProvider";
import { ProductDrawer, blankProduct } from "@/components/admin/ProductDrawer";
import { Button, Card, Pill } from "@/components/admin/ui";

export default function AdminProductsPage() {
  const { products, upsertProduct, removeProduct } = useDraft();
  const [editing, setEditing] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setEditing(blankProduct());
    setIsNew(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setIsNew(false);
  };

  const close = () => setEditing(null);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-admin-display text-2xl font-bold tracking-tight text-admin-ink">
            Products
          </h1>
          <p className="mt-1 text-sm text-admin-muted">
            {products.length} products shown in the homepage rail.
          </p>
        </div>
        <Button variant="primary" onClick={openNew}>
          + Add product
        </Button>
      </header>

      <Card className="overflow-hidden">
        {/* Desktop table */}
        <table className="hidden w-full sm:table">
          <thead>
            <tr className="border-b border-admin-border text-left">
              {["Product", "Price", "Badge", "COD", ""].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-admin-subtle"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                className="border-b border-admin-border last:border-0 hover:bg-admin-surface-alt"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`relative h-12 w-10 shrink-0 overflow-hidden rounded ${backdropClass[p.backdrop]}`}
                    >
                      <Image src={p.image.src} alt="" fill sizes="40px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-admin-ink">{p.name}</p>
                      <p className="truncate text-xs text-admin-subtle">{p.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="text-sm text-admin-ink">{formatINR(p.price)}</span>
                  {p.compareAtPrice && p.compareAtPrice > p.price && (
                    <span className="ml-2 text-xs text-admin-subtle line-through">
                      {formatINR(p.compareAtPrice)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {p.badge ? <Pill tone="accent">{p.badge}</Pill> : <span className="text-xs text-admin-subtle">—</span>}
                </td>
                <td className="px-5 py-3">
                  {/* Both COD states are meaningful, so both get a pill. The
                      badge column differs on purpose: no badge is an absence,
                      not a state, so it shows a dash. */}
                  {p.codAvailable ? (
                    <Pill>Available</Pill>
                  ) : (
                    <Pill tone="muted">Not available</Pill>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Button onClick={() => openEdit(p)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile list */}
        <ul className="divide-y divide-admin-border sm:hidden">
          {products.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openEdit(p)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div
                  className={`relative h-14 w-11 shrink-0 overflow-hidden rounded ${backdropClass[p.backdrop]}`}
                >
                  <Image src={p.image.src} alt="" fill sizes="44px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-admin-ink">{p.name}</p>
                  <p className="text-xs text-admin-muted">{formatINR(p.price)}</p>
                </div>
                {p.badge && <Pill tone="accent">{p.badge}</Pill>}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {editing && (
      <ProductDrawer
        key={isNew ? "new-product" : editing.id}
        product={editing}
        isNew={isNew}
        onClose={close}
        onSave={(p) => {
          upsertProduct(p);
          close();
        }}
        onDelete={(id) => {
          removeProduct(id);
          close();
        }}
      />
      )}
    </div>
  );
}
