"use client";

import { useState } from "react";
import Image from "next/image";
import type { Category } from "@/data/types";
import { useDraft } from "@/components/admin/AdminDraftProvider";
import { CategoryDrawer, blankCategory } from "@/components/admin/CategoryDrawer";
import { Button, Card, Field, TextInput } from "@/components/admin/ui";
import { withProductCounts, type CountedCategory } from "@/lib/categoryCounts";

export default function AdminCategoriesPage() {
  const { content, products, updateSection } = useDraft();
  const { heading, items } = content.categories;

  /**
   * Counted from the draft's own products, so the number staff see here is the
   * number the storefront will render once they publish. There is no stored
   * count any more — see §30 for what that field was doing wrong.
   */
  const counted = withProductCounts(items, products);

  /**
   * Strips the derived `count` before the editor sees a category.
   *
   * `CountedCategory` is assignable to `Category`, so TypeScript would happily
   * let the extra field ride into the drawer, back through `save`, and into
   * published content — quietly recreating the stored count this change exists
   * to remove. The publish schema would drop it, but only after it had already
   * been written to the draft.
   */
  const forEditing = (counted: CountedCategory): Category => {
    const category = { ...counted } as Partial<CountedCategory>;
    delete category.count;
    return category as Category;
  };

  const [editing, setEditing] = useState<Category | null>(null);
  const [isNew, setIsNew] = useState(false);

  const setItems = (next: Category[]) => updateSection("categories", { heading, items: next });

  const save = (c: Category) => {
    const i = items.findIndex((x) => x.id === c.id);
    setItems(i === -1 ? [...items, c] : items.map((x, j) => (j === i ? c : x)));
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-admin-display text-2xl font-bold tracking-tight text-admin-ink">
            Categories
          </h1>
          <p className="mt-1 text-sm text-admin-muted">
            {items.length} categories listed on the homepage.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditing(blankCategory());
            setIsNew(true);
          }}
        >
          + Add category
        </Button>
      </header>

      <Card className="mb-5">
        <div className="p-5">
          <Field
            label="Section heading"
            htmlFor="cat-heading"
            hint="The small label above the list on the homepage."
          >
            <TextInput
              id="cat-heading"
              value={heading}
              onChange={(e) =>
                updateSection("categories", { heading: e.target.value, items })
              }
            />
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="hidden w-full sm:table">
          <thead>
            <tr className="border-b border-admin-border text-left">
              {["Category", "Items", "Photo", ""].map((h) => (
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
            {counted.map((c) => (
              <tr
                key={c.id}
                className="border-b border-admin-border last:border-0 hover:bg-admin-surface-alt"
              >
                <td className="px-5 py-3">
                  <p className="text-sm font-medium text-admin-ink">{c.name}</p>
                  <p className="text-xs text-admin-subtle">{c.id}</p>
                </td>
                <td className="px-5 py-3 text-sm text-admin-ink">{c.count}</td>
                <td className="px-5 py-3">
                  <div className="relative h-12 w-10 overflow-hidden rounded bg-ink-raised">
                    <Image src={c.image.src} alt="" fill sizes="40px" className="object-cover" />
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <Button
                    onClick={() => {
                      setEditing(forEditing(c));
                      setIsNew(false);
                    }}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="divide-y divide-admin-border sm:hidden">
          {counted.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setEditing(forEditing(c));
                  setIsNew(false);
                }}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded bg-ink-raised">
                  <Image src={c.image.src} alt="" fill sizes="44px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-admin-ink">{c.name}</p>
                  <p className="text-xs text-admin-muted">
                    {c.count} {c.count === 1 ? "item" : "items"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {editing && (
        <CategoryDrawer
          key={isNew ? "new-category" : editing.id}
          category={editing}
          isNew={isNew}
          onSave={save}
          onDelete={(id) => {
            setItems(items.filter((c) => c.id !== id));
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
