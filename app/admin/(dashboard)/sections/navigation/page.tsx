"use client";

import Link from "next/link";
import type { BottomNavIcon, BottomNavItem } from "@/data/types";
import { bottomNavIcons } from "@/components/ui/Icons";
import { useDraft } from "@/components/admin/AdminDraftProvider";
import { SectionPage } from "@/components/admin/SectionPage";
import { LinkListEditor } from "@/components/admin/LinkListEditor";
import { ReorderRow, moveItem } from "@/components/admin/ReorderableList";
import { Card, CardHeader, Field, Select, TextInput } from "@/components/admin/ui";

/**
 * `NavContent` is `{ wordmark, links, bottomNav }`.
 *
 * The brief expected a WhatsApp support field here, but that link lives in
 * `footer.links` in the schema — it's edited on the Footer page, and this page
 * points there instead of duplicating it.
 */
const ICON_OPTIONS: BottomNavIcon[] = ["home", "shop", "wishlist", "bag"];
const ICON_LABELS: Record<BottomNavIcon, string> = {
  home: "Home",
  shop: "Shop",
  wishlist: "Wishlist",
  bag: "Bag",
};

export default function NavigationEditorPage() {
  const { content, updateSection } = useDraft();
  const nav = content.nav;

  const setBottom = (bottomNav: BottomNavItem[]) => updateSection("nav", { ...nav, bottomNav });
  const patchBottom = (i: number, p: Partial<BottomNavItem>) =>
    setBottom(nav.bottomNav.map((b, j) => (j === i ? { ...b, ...p } : b)));

  return (
    <SectionPage
      title="Navigation"
      description="The menu at the top of every page, and the bar along the bottom on phones."
    >
      <div className="space-y-5">
        <Card>
          <CardHeader title="Logo text" hint="Shown centred in the top bar." />
          <div className="p-5">
            <Field label="Wordmark" htmlFor="wordmark">
              <TextInput
                id="wordmark"
                value={nav.wordmark}
                onChange={(e) => updateSection("nav", { ...nav, wordmark: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={`Menu links (${nav.links.length})`}
            hint="Shown across the top on desktop, and in the slide-out menu on phones."
          />
          <div className="p-5">
            <LinkListEditor
              value={nav.links}
              onChange={(links) => updateSection("nav", { ...nav, links })}
              addLabel="+ Add menu link"
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title={`Bottom bar (${nav.bottomNav.length})`}
            hint="The fixed bar at the bottom of the screen on phones only."
          />
          <div className="p-5">
            <ul className="space-y-2">
              {nav.bottomNav.map((item, i) => {
                const Icon = bottomNavIcons[item.icon];
                return (
                  <ReorderRow
                    key={item.id}
                    index={i}
                    total={nav.bottomNav.length}
                    title={item.label}
                    subtitle={item.href}
                    onMove={(from, to) => setBottom(moveItem(nav.bottomNav, from, to))}
                    onRemove={(idx) => setBottom(nav.bottomNav.filter((_, j) => j !== idx))}
                    canRemove={nav.bottomNav.length > 1}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-lg bg-ink px-4 py-3">
                        <Icon className="h-5 w-5 text-bone" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-bone">
                          {item.label}
                        </span>
                      </div>

                      <Field label="Icon" htmlFor={`bn-icon-${i}`}>
                        <Select
                          id={`bn-icon-${i}`}
                          value={item.icon}
                          onChange={(e) =>
                            patchBottom(i, { icon: e.target.value as BottomNavIcon })
                          }
                        >
                          {ICON_OPTIONS.map((ic) => (
                            <option key={ic} value={ic}>
                              {ICON_LABELS[ic]}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field label="Text" htmlFor={`bn-label-${i}`}>
                        <TextInput
                          id={`bn-label-${i}`}
                          value={item.label}
                          onChange={(e) => patchBottom(i, { label: e.target.value })}
                        />
                      </Field>

                      <Field
                        label="Link"
                        htmlFor={`bn-href-${i}`}
                        note="Coming soon"
                        hint="These pages are coming soon, so the link won't open anything yet."
                      >
                        <TextInput
                          id={`bn-href-${i}`}
                          value={item.href}
                          onChange={(e) => patchBottom(i, { href: e.target.value })}
                        />
                      </Field>
                    </div>
                  </ReorderRow>
                );
              })}
            </ul>
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <p className="text-sm text-admin-ink">Looking for WhatsApp support?</p>
            <p className="mt-1 text-sm text-admin-muted">
              That link sits in the footer.{" "}
              <Link
                href="/admin/sections/footer"
                className="font-medium text-admin-accent hover:underline"
              >
                Edit it on the Footer page
              </Link>
              .
            </p>
          </div>
        </Card>
      </div>
    </SectionPage>
  );
}
