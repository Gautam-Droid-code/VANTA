"use client";

import Image from "next/image";
import { backdropClass } from "@/lib/backdrops";
import { formatINR } from "@/lib/format";
import { useDraft } from "@/components/admin/AdminDraftProvider";
import { SectionPage } from "@/components/admin/SectionPage";
import { HeadlineEditor } from "@/components/admin/HeadlineEditor";
import { ReorderRow, moveItem } from "@/components/admin/ReorderableList";
import { Button, Card, CardHeader, Field, TextInput } from "@/components/admin/ui";

/**
 * `ProductRailContent` is `{ headline, viewAll, productIds }`.
 *
 * The brief described this page as configuration only ("which products and in
 * what order"), but the schema also owns the section headline and the "View
 * All" link — so those are edited here too. Products themselves are edited on
 * the Products page; this only references them by id.
 */
export default function ProductRailEditorPage() {
  const { content, updateSection, products } = useDraft();
  const rail = content.productRail;

  const byId = new Map(products.map((p) => [p.id, p]));
  const selected = rail.productIds.filter((id) => byId.has(id));
  const available = products.filter((p) => !rail.productIds.includes(p.id));

  const setIds = (productIds: string[]) => updateSection("productRail", { ...rail, productIds });

  return (
    <SectionPage
      title="Product Rail"
      description="The “Built for every move” row of products on the homepage."
    >
      <div className="space-y-5">
        <Card>
          <CardHeader title="Heading" hint="The large text above the row." />
          <div className="p-5">
            <HeadlineEditor
              value={rail.headline}
              onChange={(headline) => updateSection("productRail", { ...rail, headline })}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="“View all” link" />
          <div className="space-y-4 p-5">
            <Field label="Text" htmlFor="viewall-label">
              <TextInput
                id="viewall-label"
                value={rail.viewAll.label}
                onChange={(e) =>
                  updateSection("productRail", {
                    ...rail,
                    viewAll: { ...rail.viewAll, label: e.target.value },
                  })
                }
              />
            </Field>
            <Field
              label="Link"
              htmlFor="viewall-href"
              note="Coming soon"
              hint="The all-products page is coming soon, so this won't open anything yet."
            >
              <TextInput
                id="viewall-href"
                value={rail.viewAll.href}
                onChange={(e) =>
                  updateSection("productRail", {
                    ...rail,
                    viewAll: { ...rail.viewAll, href: e.target.value },
                  })
                }
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={`Products in the row (${selected.length})`}
            hint="Pick which products appear and in what order. Edit product details on the Products page."
          />
          <div className="p-5">
            <ul className="space-y-2">
              {selected.map((id, i) => {
                const p = byId.get(id)!;
                return (
                  <ReorderRow
                    key={id}
                    index={i}
                    total={selected.length}
                    title={p.name}
                    subtitle={formatINR(p.price)}
                    onMove={(from, to) => setIds(moveItem(selected, from, to))}
                    onRemove={(idx) => setIds(selected.filter((_, j) => j !== idx))}
                  >
                    <div
                      className={`relative h-16 w-13 overflow-hidden rounded ${backdropClass[p.backdrop]}`}
                      style={{ width: 52 }}
                    >
                      <Image src={p.image.src} alt="" fill sizes="52px" className="object-cover" />
                    </div>
                  </ReorderRow>
                );
              })}
            </ul>

            {selected.length === 0 && (
              <p className="rounded-lg border border-dashed border-admin-border-strong px-4 py-6 text-center text-sm text-admin-muted">
                No products in the row yet. Add one below.
              </p>
            )}

            {available.length > 0 && (
              <div className="mt-5 border-t border-admin-border pt-4">
                <p className="mb-2 text-[13px] font-medium text-admin-ink">
                  Add a product to the row
                </p>
                <ul className="space-y-2">
                  {available.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-lg border border-admin-border px-3 py-2"
                    >
                      <div
                        className={`relative h-10 w-8 shrink-0 overflow-hidden rounded ${backdropClass[p.backdrop]}`}
                      >
                        <Image src={p.image.src} alt="" fill sizes="32px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-admin-ink">{p.name}</p>
                        <p className="text-xs text-admin-muted">{formatINR(p.price)}</p>
                      </div>
                      <Button onClick={() => setIds([...selected, p.id])}>Add</Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
    </SectionPage>
  );
}
