"use client";

import type { TrustIcon, TrustItem } from "@/data/types";
import { trustIcons } from "@/components/ui/Icons";
import { useDraft } from "@/components/admin/AdminDraftProvider";
import { SectionPage } from "@/components/admin/SectionPage";
import { AddButton, ReorderRow, moveItem } from "@/components/admin/ReorderableList";
import { Card, CardHeader, Field, TextInput } from "@/components/admin/ui";
import { cn } from "@/lib/format";

/**
 * `TrustItem` is `{ id, icon, title, detail }` and `TrustIcon` is a closed
 * union of four values — so the icon picker is fixed, exactly as the brief
 * wanted, and reuses the storefront's own icon set.
 *
 * The brief called this "4 fixed items", but `trust.items` is an unbounded
 * array in the schema, so add/remove is supported.
 */
const ICON_OPTIONS: Array<{ value: TrustIcon; label: string }> = [
  { value: "shipping", label: "Shipping" },
  { value: "returns", label: "Returns" },
  { value: "cod", label: "Cash on delivery" },
  { value: "secure", label: "Secure payment" },
];

export default function TrustEditorPage() {
  const { content, updateSection } = useDraft();
  const items = content.trust.items;

  const setItems = (next: TrustItem[]) => updateSection("trust", { items: next });
  const patch = (i: number, p: Partial<TrustItem>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...p } : it)));

  return (
    <SectionPage
      title="Trust Strip"
      description="The row of reassurance points — shipping, returns, payment."
    >
      <Card>
        <CardHeader
          title={`Items (${items.length})`}
          hint="Shown 2-up on phones and 4-up on desktop."
        />
        <div className="p-5">
          <ul className="space-y-3">
            {items.map((item, i) => {
              const Icon = trustIcons[item.icon];
              return (
                <ReorderRow
                  key={item.id}
                  index={i}
                  total={items.length}
                  title={item.title || "Untitled"}
                  subtitle={item.detail}
                  onMove={(from, to) => setItems(moveItem(items, from, to))}
                  onRemove={(idx) => setItems(items.filter((_, j) => j !== idx))}
                  canRemove={items.length > 1}
                >
                  <div className="space-y-4">
                    <Field label="Icon">
                      <div role="radiogroup" aria-label="Icon" className="grid grid-cols-4 gap-2">
                        {ICON_OPTIONS.map((opt) => {
                          const OptIcon = trustIcons[opt.value];
                          const active = item.icon === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => patch(i, { icon: opt.value })}
                              className={cn(
                                "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 transition-colors",
                                active
                                  ? "border-admin-accent bg-admin-accent-soft text-admin-accent"
                                  : "border-admin-border text-admin-muted hover:border-admin-border-strong",
                              )}
                            >
                              <OptIcon className="h-5 w-5" />
                              <span className="text-[10px] font-medium leading-tight">
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    <Field label="Title" htmlFor={`trust-title-${i}`}>
                      <TextInput
                        id={`trust-title-${i}`}
                        value={item.title}
                        onChange={(e) => patch(i, { title: e.target.value })}
                      />
                    </Field>

                    <Field
                      label="Detail"
                      htmlFor={`trust-detail-${i}`}
                      hint="The smaller line underneath."
                    >
                      <TextInput
                        id={`trust-detail-${i}`}
                        value={item.detail}
                        onChange={(e) => patch(i, { detail: e.target.value })}
                      />
                    </Field>

                    <div className="flex items-center gap-3 rounded-lg bg-ink px-4 py-4">
                      <Icon className="h-6 w-6 text-bone/80" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-bone">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-bone/50">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                </ReorderRow>
              );
            })}
          </ul>

          <AddButton
            onClick={() =>
              setItems([
                ...items,
                {
                  id: `trust-${Date.now()}`,
                  icon: "shipping",
                  title: "New item",
                  detail: "",
                },
              ])
            }
          >
            + Add item
          </AddButton>
        </div>
      </Card>
    </SectionPage>
  );
}
