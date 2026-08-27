"use client";

import Link from "next/link";
import { adminNav } from "@/components/admin/adminNav";
import { useDraft } from "@/components/admin/AdminDraftProvider";
import { Card } from "@/components/admin/ui";
import { ChevronIcon } from "@/components/admin/AdminIcons";

/** The Homepage's sections, in the order they appear on the page itself. */
const sections =
  adminNav
    .find((i) => i.href === "/admin/pages")
    ?.children?.find((c) => c.href === "/admin/pages/homepage")?.children ?? [];

export default function HomepageIndex() {
  const { dirtySections } = useDraft();

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="mb-1 text-xs text-admin-muted">
            <Link href="/admin/pages" className="hover:text-admin-ink">
              Pages
            </Link>
            <span aria-hidden className="px-1.5">
              /
            </span>
            <span className="text-admin-ink">Homepage</span>
          </nav>
          <h1 className="font-admin-display text-2xl font-bold tracking-tight text-admin-ink">
            Homepage
          </h1>
          <p className="mt-1 text-sm text-admin-muted">
            The sections visitors see, top to bottom.
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-admin-border-strong bg-admin-surface px-3 py-1.5 text-sm font-medium text-admin-ink transition-colors hover:bg-admin-surface-alt"
        >
          View live page
        </Link>
      </header>

      <ol className="space-y-3">
        {sections.map((section, i) => {
          // Marks which sections have unpublished edits, so the list doubles
          // as an answer to "what have I changed?".
          const edited = dirtySections.includes(section.label);
          return (
            <li key={section.href}>
              <Link href={section.href} className="block">
                <Card className="flex items-center gap-4 px-5 py-4 transition-colors hover:border-admin-border-strong">
                  <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-admin-subtle">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-sm font-medium text-admin-ink">
                    {section.label}
                  </span>
                  {edited ? (
                    <span className="shrink-0 rounded border border-admin-accent/30 bg-admin-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-admin-accent">
                      Edited
                    </span>
                  ) : null}
                  <ChevronIcon className="h-4 w-4 shrink-0 text-admin-subtle" />
                </Card>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
