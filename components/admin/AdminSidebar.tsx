"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav, type AdminNavItem } from "./adminNav";
import { ChevronIcon, CloseIcon, ExternalIcon } from "./AdminIcons";
import { cn } from "@/lib/format";

interface AdminSidebarProps {
  /** Mobile drawer state — ignored at lg where the sidebar is always visible. */
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile scrim */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink text-bone transition-transform duration-300 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Wordmark — plain tracked-out text, matching the storefront mark */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          <Link
            href="/admin"
            className="whitespace-nowrap font-display text-base font-black uppercase leading-none text-bone"
            style={{ letterSpacing: "0.3em", paddingLeft: "0.3em" }}
          >
            VANTA
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-2 p-2 text-bone/70 hover:text-bone lg:hidden"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="px-6 pb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-bone/35">
          Content Manager
        </p>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {adminNav.map((item) => (
              <NavRow key={item.href} item={item} pathname={pathname} onNavigate={onClose} />
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-bone/10 p-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-bone/60 transition-colors hover:bg-bone/5 hover:text-bone"
          >
            View live site
            <ExternalIcon className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    </>
  );
}

function NavRow({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const hasChildren = Boolean(item.children?.length);
  const sectionActive = hasChildren && pathname.startsWith(item.href);
  const [expanded, setExpanded] = useState(sectionActive);
  const Icon = item.icon;
  const active = pathname === item.href;

  const rowClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150";

  if (hasChildren) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={cn(
            rowClass,
            sectionActive ? "text-bone" : "text-bone/65 hover:bg-bone/5 hover:text-bone",
          )}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronIcon
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              expanded && "rotate-90",
            )}
          />
        </button>

        {expanded && (
          <ul className="mb-1 ml-[26px] mt-0.5 space-y-0.5 border-l border-bone/10 pl-3">
            {item.children!.map((child) => {
              const childActive = pathname === child.href;
              if (!child.ready) {
                return (
                  <li key={child.href}>
                    <span
                      title="Coming soon"
                      className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-[13px] text-bone/25"
                    >
                      {child.label}
                      <span className="text-[9px] uppercase tracking-wider">Soon</span>
                    </span>
                  </li>
                );
              }
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={childActive ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-2 text-[13px] transition-colors duration-150",
                      childActive
                        ? "bg-admin-accent/15 font-medium text-admin-accent"
                        : "text-bone/60 hover:bg-bone/5 hover:text-bone",
                    )}
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  if (!item.ready) {
    return (
      <li>
        <span
          title="Coming soon"
          className={cn(rowClass, "cursor-not-allowed text-bone/25")}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1">{item.label}</span>
          <span className="text-[9px] uppercase tracking-wider">Soon</span>
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          rowClass,
          active
            ? "bg-admin-accent font-medium text-white"
            : "text-bone/65 hover:bg-bone/5 hover:text-bone",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1">{item.label}</span>
      </Link>
    </li>
  );
}
