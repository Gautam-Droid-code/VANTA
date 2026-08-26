"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { UnpublishedBanner } from "./UnpublishedBanner";
import { BellIcon, MenuIcon, SearchIcon } from "./AdminIcons";
import { LogoutButton } from "./LogoutButton";

/**
 * Admin chrome: fixed dark sidebar, light workspace, top bar, and the
 * unpublished-changes bar. Client only because of the mobile drawer state —
 * page content is passed through as `children` and can stay server-rendered.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-admin-bg text-admin-ink">
      <AdminSidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-admin-border bg-admin-surface/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              className="-ml-2 rounded-lg p-2 text-admin-muted transition-colors hover:bg-admin-bg hover:text-admin-ink lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            {/* Search — not functional yet; matches the sidebar's "Soon" convention */}
            <div className="relative hidden max-w-sm flex-1 sm:block">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-subtle" />
              <input
                type="search"
                disabled
                placeholder="Search — coming soon"
                className="w-full cursor-not-allowed rounded-lg border border-admin-border bg-admin-bg py-2 pl-9 pr-3 text-sm text-admin-ink placeholder:text-admin-subtle disabled:opacity-70"
              />
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                aria-label="Notifications — coming soon"
                title="Coming soon"
                className="relative cursor-not-allowed rounded-lg p-2 text-admin-muted"
              >
                <BellIcon className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-admin-accent" />
              </button>

              <div className="ml-2 flex items-center gap-2 border-l border-admin-border pl-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-bone">
                  SK
                </span>
                <span className="hidden text-sm text-admin-muted sm:block">Store Team</span>
                <LogoutButton />
              </div>
            </div>
          </div>

          <UnpublishedBanner />
        </header>

        <main className="px-4 py-8 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
