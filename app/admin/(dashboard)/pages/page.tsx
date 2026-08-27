"use client";

import Link from "next/link";
import { adminNav } from "@/components/admin/adminNav";
import { Card } from "@/components/admin/ui";
import { ChevronIcon } from "@/components/admin/AdminIcons";

/**
 * The Pages index.
 *
 * Reads the same `adminNav` tree the sidebar does rather than listing pages
 * again here — two hand-maintained lists of the same thing drift, and the one
 * in the sidebar is the one people navigate by.
 */
const pages = adminNav.find((i) => i.href === "/admin/pages")?.children ?? [];

export default function PagesIndex() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="font-admin-display text-2xl font-bold tracking-tight text-admin-ink">
          Pages
        </h1>
        <p className="mt-1 text-sm text-admin-muted">
          Each page on the site, and the parts of it you can edit.
        </p>
      </header>

      <ul className="space-y-3">
        {pages.map((page) => {
          const sectionCount = page.children?.length ?? 0;

          if (!page.ready) {
            return (
              <li key={page.href}>
                <Card className="flex items-center justify-between gap-4 px-5 py-4 opacity-60">
                  <div>
                    <p className="text-sm font-medium text-admin-ink">{page.label}</p>
                    <p className="mt-0.5 text-xs text-admin-muted">
                      Built from your products and categories. Nothing to edit here yet.
                    </p>
                  </div>
                  <span className="shrink-0 rounded border border-admin-border bg-admin-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-admin-subtle">
                    Soon
                  </span>
                </Card>
              </li>
            );
          }

          return (
            <li key={page.href}>
              <Link href={page.href} className="block">
                <Card className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:border-admin-border-strong">
                  <div>
                    <p className="text-sm font-medium text-admin-ink">{page.label}</p>
                    <p className="mt-0.5 text-xs text-admin-muted">
                      {sectionCount} editable {sectionCount === 1 ? "section" : "sections"}
                    </p>
                  </div>
                  <ChevronIcon className="h-4 w-4 shrink-0 text-admin-subtle" />
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
