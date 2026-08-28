"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/data/types";
import { ImagePicker } from "./ImagePicker";
import { Button, Field, Select, TextArea, TextInput, Toggle } from "./ui";
import { useDraft } from "./AdminDraftProvider";
import { CloseIcon } from "./AdminIcons";
import { slugify } from "./ProductDrawer";

/**
 * `Category` is `{ id, name, href, image, itemCount }` plus the optional
 * page-level fields its own collection page renders — `description` and
 * `banner`. Those live here rather than on the Collection pages editor because
 * they differ per collection; that editor holds only what all of them share.
 *
 * Mounted with a `key` per category so opening a different row remounts it.
 */
export function CategoryDrawer({
  category,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  category: Category;
  isNew: boolean;
  onSave: (c: Category) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Category>(category);
  const { content } = useDraft();

  /**
   * Categories that can be a group for this one: anything that is not itself
   * inside a group, and not this category. Offering the rest would let someone
   * build the two-level nesting the schema refuses at publish.
   */
  const groupOptions = content.categories.items.filter(
    (c) => c.id !== draft.id && !c.parentId,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const patch = (p: Partial<Category>) => setDraft({ ...draft, ...p });

  return (
    <>
      <div onClick={onClose} aria-hidden className="fixed inset-0 z-50 bg-black/40" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? "Add category" : `Edit ${draft.name}`}
        className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[520px] flex-col bg-admin-bg shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-admin-border bg-admin-surface px-5 py-4">
          <h2 className="truncate font-admin-display text-base font-semibold text-admin-ink">
            {isNew ? "Add category" : draft.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 rounded-lg p-2 text-admin-muted transition-colors hover:bg-admin-bg hover:text-admin-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <Field label="Category name" htmlFor="c-name">
            <TextInput
              id="c-name"
              value={draft.name}
              onChange={(e) => {
                const name = e.target.value;
                patch(
                  isNew
                    ? { name, id: slugify(name), href: `/collections/${slugify(name)}` }
                    : { name },
                );
              }}
            />
          </Field>

          <Field
            label="Category ID"
            htmlFor="c-id"
            note="Auto"
            hint="Created automatically from the category name."
          >
            <TextInput id="c-id" value={draft.id} disabled />
          </Field>

          {/* Groups hold no products of their own; their page shows whatever
              is in their children. */}
          <Field
            label="Group"
            htmlFor="c-parent"
            hint="Optional. Puts this category inside a wider one, like Clothing. Its products still appear on the group's page."
          >
            <Select
              id="c-parent"
              value={draft.parentId ?? ""}
              onChange={(e) => patch({ parentId: e.target.value || undefined })}
            >
              <option value="">No group — top level</option>
              {groupOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Number of items"
            htmlFor="c-count"
            hint="Shown next to the category name on the homepage. Typed in by hand — the collection page counts products itself."
          >
            <TextInput
              id="c-count"
              type="number"
              min={0}
              value={draft.itemCount}
              onChange={(e) => patch({ itemCount: Number(e.target.value) })}
            />
          </Field>

          {/* Everything below appears on this category's own collection page. */}
          <Field
            label="Collection page intro"
            htmlFor="c-description"
            hint={`${(draft.description ?? "").length} characters · optional, shown under the heading. Press Enter to start a new line.`}
          >
            <TextArea
              id="c-description"
              rows={4}
              value={draft.description ?? ""}
              /* Stored as undefined rather than "" when cleared, matching the
                 field's optionality — the same rule the external link toggle
                 follows. */
              onChange={(e) => patch({ description: e.target.value || undefined })}
            />
          </Field>

          <Toggle
            checked={Boolean(draft.banner)}
            onChange={(on) =>
              patch({
                banner: on
                  ? (draft.banner ?? { ...draft.image, alt: "" })
                  : undefined,
              })
            }
            label="Show a wide image above the products"
            hint="Off by default. The plain heading is the finished design without it."
          />

          {draft.banner ? (
            <Field label="Banner image" htmlFor="c-banner">
              <ImagePicker
                idPrefix="c-banner"
                value={draft.banner}
                onChange={(banner) => patch({ banner })}
                slot="collectionBanner"
              />
            </Field>
          ) : null}

          <Field label="Background photo" hint="Revealed behind the row when someone hovers or taps it.">
            <ImagePicker
              value={draft.image}
              onChange={(image) => patch({ image })}
              idPrefix="c-image"
              slot="category"
            />
          </Field>

          <Field
            label="Link"
            htmlFor="c-href"
            note="Coming soon"
            hint="Collection pages are coming soon, so this won't open anything yet."
          >
            <TextInput
              id="c-href"
              value={draft.href}
              onChange={(e) => patch({ href: e.target.value })}
            />
          </Field>
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-admin-border bg-admin-surface px-5 py-4">
          {!isNew && onDelete && (
            <Button variant="danger" onClick={() => onDelete(draft.id)}>
              Delete
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!draft.name.trim() || !draft.id}
              onClick={() => onSave(draft)}
            >
              {isNew ? "Add category" : "Save changes"}
            </Button>
          </div>
        </footer>
      </aside>
    </>
  );
}

export const blankCategory = (): Category => ({
  id: "",
  name: "",
  href: "",
  itemCount: 0,
  image: { src: "/images/model-01.webp", alt: "", width: 848, height: 1264 },
});
